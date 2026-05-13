import { Router } from "express";
import { supabase, getSupabaseAdmin } from "../lib/supabase.ts";
import { sendEmail } from "../lib/email.ts";

const router = Router();

// Middleware to verify user session from Supabase
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  next();
};

// Middleware to verify admin status
const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const adminEmail = process.env.ADMIN_EMAIL || "muczajanos7@gmail.com";
  
  // Check if user is admin specifically from the profiles table
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", req.user.id)
    .single();

  if (error || !profile?.is_admin) {
    // Secondary check for hardcoded admin email if profile lookup fails
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
  }

  next();
};

// --- ROUTES ---

// Get current user profile
router.get("/me", authenticate, async (req: any, res) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: req.user, profile });
});

// Create an appointment (Admin is forbidden from booking for themselves)
router.post("/appointments", async (req: any, res) => {
  const { 
    customer_name, 
    phone, 
    machine_model, 
    description, 
    image_url,
    requested_date,
    user_id 
  } = req.body;

  if (!customer_name || !phone || !machine_model || !requested_date) {
    return res.status(400).json({ error: "Hiányzó adatok." });
  }

  const admin = getSupabaseAdmin();

  // 1. Business Hour & Date Validation on server-side
  const date = new Date(requested_date);
  const hour = date.getHours();
  const day = date.getDay();

  if (day === 0 || day === 6) {
    return res.status(400).json({ error: "Hétvégén zárva tartunk." });
  }

  if (hour < 8 || hour >= 17) {
    return res.status(400).json({ error: "Nyitvatartási idő: 08:00 - 17:00." });
  }

  // 2. Conflict Check on server-side
  const { data: existing } = await admin
    .from("appointments")
    .select("id")
    .eq("requested_date", requested_date)
    .neq("status", "lemondva")
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: "Ez az időpont már foglalt." });
  }

  // If a user_id is provided, verify they are not an admin
  if (user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user_id)
      .single();

    if (profile?.is_admin) {
      return res.status(403).json({ error: "Adminisztrátorok nem foglalhatnak időpontot szervizre." });
    }
  }

  // Use admin client to bypass RLS since the server is trusted
  const { data, error } = await admin
    .from("appointments")
    .insert([{
      customer_name,
      phone,
      machine_model,
      description,
      image_url,
      requested_date,
      user_id: user_id || null,
      status: "függőben"
    }])
    .select()
    .single();

  if (error) {
    console.error("Booking error:", error);
    return res.status(500).json({ error: "Nem sikerült menteni a foglalást: " + error.message });
  }
  
  res.json(data);
});

// Admin-only stats (example)
router.get("/admin/stats", authenticate, requireAdmin, async (req, res) => {
  const admin = getSupabaseAdmin();
  
  const [repairs, appointments, machines] = await Promise.all([
    admin.from("repairs").select("id", { count: "exact", head: true }),
    admin.from("appointments").select("id", { count: "exact", head: true }),
    admin.from("machines_for_sale").select("id", { count: "exact", head: true })
  ]);

  res.json({
    totalRepairs: repairs.count,
    totalAppointments: appointments.count,
    totalMachines: machines.count
  });
});

// Example: Create a repair (Server-side validation)
router.post("/repairs", authenticate, async (req: any, res) => {
  const { machine_model, issue_description } = req.body;

  if (!machine_model || !issue_description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("repairs")
    .insert([{
      user_id: req.user.id,
      machine_model,
      issue_description,
      status: "beérkezett"
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Update appointment status and notify customer
router.patch("/admin/appointments/:id/status", authenticate, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const admin = getSupabaseAdmin();

  // 1. Fetch the appointment to get the email/user info
  const { data: appointment, error: fetchError } = await admin
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !appointment) {
    return res.status(404).json({ error: "Időpont nem található." });
  }

  // 2. Update the status and public note
  const { data, error } = await admin
    .from("appointments")
    .update({ 
      status, 
      public_note: note || appointment.public_note 
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 3. Send notification (Try to find email)
  let recipientEmail = null;
  
  if (appointment.user_id) {
    const { data: userData } = await admin.auth.admin.getUserById(appointment.user_id);
    recipientEmail = userData.user?.email;
  }

  // If we don't have an email in auth, we could potentially have it in a profiles table or just use a placeholder
  // For this version, we trigger the notification if we have an email or just log it
  if (recipientEmail || appointment.phone) {
    try {
      const statusText = status === "visszaigazolva" ? "Visszaigazolva" : status === "lemondva" ? "Elutasítva/Lemondva" : status;
      
      await sendEmail({
        to: recipientEmail || "muczajanos7@gmail.com", // Fallback for dev
        subject: `Időpont foglalás frissítés: ${statusText}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #c4a484; margin: 0;">☕ Kávégép Szerviz</h1>
            </div>
            <h2 style="color: #333;">Tisztelt ${appointment.customer_name}!</h2>
            <p>Az Ön időpont foglalásának állapota megváltozott.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #c4a484;">
              <p style="margin: 5px 0;"><strong>Új állapot:</strong> <span style="color: #c4a484; font-weight: bold;">${statusText}</span></p>
              <p style="margin: 5px 0;"><strong>Készülék:</strong> ${appointment.machine_model}</p>
              <p style="margin: 5px 0;"><strong>Időpont:</strong> ${new Date(appointment.requested_date).toLocaleString('hu-HU')}</p>
            </div>
            ${note ? `
            <div style="margin: 20px 0; padding: 15px; background: #fff8f0; border: 1px dashed #c4a484; border-radius: 5px;">
              <p style="margin: 0; font-weight: bold; color: #8a6d3b;">Üzenet a szerviztől:</p>
              <p style="margin: 10px 0 0 0; color: #333; font-style: italic;">"${note}"</p>
            </div>
            ` : ""}
            <p>Amennyiben kérdése van, forduljon hozzánk bizalommal!</p>
            <p>Üdvözlettel,<br><strong>Kávégép Szerviz Csapata</strong></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 11px; color: #999; text-align: center;">Ez egy automatikus üzenet, kérjük ne válaszoljon rá.</p>
          </div>
        `,
        text: `Tisztelt ${appointment.customer_name}!\n\nAz Ön időpont foglalásának állapota megváltozott: ${statusText}.\n${note ? `Üzenet: ${note}` : ""}\n\nKöszönjük!`
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }
  }

  res.json(data);
});

export default router;
