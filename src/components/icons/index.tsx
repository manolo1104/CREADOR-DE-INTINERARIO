/**
 * icons/index.tsx
 * Mapa central de iconos Lucide para el sitio.
 * Todos los iconos de la UI pasan por aquí — un solo lugar para cambiar el set.
 */

export {
  // ── Destinos ────────────────────────────────────────────────
  Landmark,       // Las Pozas / Zona Arqueológica Tamtoc
  Waves,          // Cascada de Tamul / Cascadas de Tamasopo
  Bird,           // Sótano de las Golondrinas
  Droplets,       // Cascadas de Micos
  MountainSnow,   // Puente de Dios (estructura natural)
  BookOpen,       // Zona Arqueológica Tamtoc (cultura)
  Droplet,        // Cascadas de Tamasopo
  Thermometer,    // Balneario Taninul

  // ── Transporte ──────────────────────────────────────────────
  Plane,
  Bus,
  Car,
  Bike,
  Ship,

  // ── Tiempo / Logística ──────────────────────────────────────
  Clock,
  Calendar,
  MapPin,
  Navigation,
  Compass,

  // ── Presupuesto / Pagos ─────────────────────────────────────
  DollarSign,
  CreditCard,
  Coins,

  // ── Actividades / Experiencias ──────────────────────────────
  Mountain,
  TreePine,
  Camera,
  Zap,
  Flame,
  Anchor,

  // ── Personas / Equipo ───────────────────────────────────────
  Users,
  User,
  Globe,

  // ── Calidad / Estado ────────────────────────────────────────
  Award,
  Star,
  StarHalf,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Lightbulb,
  BadgeCheck,
  Shield,
  ShieldCheck,

  // ── Salud / Seguridad ───────────────────────────────────────
  Stethoscope,
  Hospital,
  HeartPulse,
  Phone,

  // ── Equipamiento ────────────────────────────────────────────
  Backpack,
  Smartphone,
  MessageCircle,
  ClipboardList,
  Utensils,

  // ── Naturaleza / Clima ──────────────────────────────────────
  Leaf,
  Sun,
  Wind,
  CloudRain,

} from "lucide-react";

// ── Mapa de destino → nombre de icono ───────────────────────────────────────
// Úsalo en Navbar y cualquier lugar que accede destinos dinámicamente.
export const DESTINO_ICON_MAP: Record<string, string> = {
  "las-pozas-jardin-surrealista":  "Landmark",
  "cascada-de-tamul":              "Waves",
  "sotano-de-las-golondrinas":     "Bird",
  "cascadas-de-micos":             "Droplets",
  "puente-de-dios-tamasopo":       "MountainSnow",
  "zona-arqueologica-tamtoc":      "BookOpen",
  "cascadas-de-tamasopo":          "Droplet",
  "balneario-taninul":             "Thermometer",
};
