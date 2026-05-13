import { Router } from "express";
import { supabase, getSupabaseAdmin } from "../lib/supabase.ts";

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

export default router;
