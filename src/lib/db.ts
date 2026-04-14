import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE  = path.join(DATA_DIR, "db.json");

export interface User {
  id: string; email: string; name: string; username: string;
  passwordHash: string; role: "player" | "coach" | "admin";
  location?: string; bio?: string; avatarUrl?: string;
  phone?: string;
  sports?: string[];
  reliabilityScore: number; gamesPlayed: number; gamesOrganized: number;
  attendanceRate: number; createdAt: string;
  passwordResetToken?: string | null; passwordResetExpiry?: string | null;
  deletedAt?: string | null;
}
export interface Coach {
  id: string; name: string; sport: string; type: "Academy" | "Personal Trainer";
  skillLevel: string; price: string; priceMin: number; priceMax: number;
  timing: string; location: string; address: string; phone: string; email: string;
  description: string; features: string[]; imageUrl: string;
  rating: number; reviewCount: number; totalSeats: number; seatsLeft: number;
  batches: Batch[]; lat?: number; lng?: number;
  status?: "pending_approval" | "active" | "inactive";
  userId?: string; certifications?: string[];
}
export interface Batch { id: string; coachId: string; day: string; time: string; level: string; seats: number; }
export interface Game {
  id: string; sport: string; title: string; location: string; address: string;
  scheduledAt: string; duration: number; slots: number; slotsLeft: number;
  skillLevel: string; organizerId: string; cost: string; costAmount: number;
  description: string; rules: string[]; imageUrl: string;
  status: "open" | "full" | "cancelled" | "completed";
  createdAt: string; lat?: number; lng?: number;
  attendanceRecorded?: boolean;
}
export interface GamePlayer { id: string; gameId: string; userId: string; joinedAt: string; attended?: boolean; }
export interface WaitlistEntry { id: string; gameId: string; userId: string; position: number; createdAt: string; }
export interface Booking {
  id: string; userId: string; coachId: string; batchId?: string;
  status: "pending" | "confirmed" | "cancelled"; note?: string;
  coachNote?: string; createdAt: string; updatedAt: string;
}
export interface Review { id: string; userId: string; coachId: string; rating: number; text: string; reviewerName: string; createdAt: string; }

export interface CampCoach { name: string; experience: string; specialty: string; }
export interface DailyScheduleItem { time: string; activity: string; }
export interface CampTestimonial { name: string; age: number; text: string; rating: number; }
export interface Camp {
  id: string; title: string; sport: string; duration: string; dates: string;
  startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string; distance: string; price: number; priceDisplay: string;
  ageGroup: string; skillLevel: string; rating: number; reviews: number;
  participants: number; maxParticipants: number;
  description: string; highlights: string[]; included: string[]; whatToBring: string[];
  coaches: CampCoach[]; dailySchedule: DailyScheduleItem[];
  testimonials: CampTestimonial[];
  imageUrl: string; featured: boolean;
  status: "open" | "upcoming" | "full" | "completed";
  tags: string[]; organizer: string; organizerContact: string; createdAt: string;
}
export interface CampRegistration { id: string; campId: string; userId: string; childName: string; childAge: number; registeredAt: string; paymentStatus?: string; }

export interface ScheduleItem { day: string; time: string; event: string; }
export interface SportEvent {
  id: string; title: string; sport: string;
  type: "Tournament" | "Marathon" | "Festival" | "League" | "Workshop" | "Seminar" | "Tryout";
  date: string; startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string; distance: string;
  participants: number; maxParticipants: number;
  prizePool: string; entryFee: string; entryFeeAmount: number;
  difficulty: string; imageUrl: string; featured: boolean;
  status: "Registration Open" | "Full" | "Live" | "Completed" | "Coming Soon";
  description: string; format: string[]; prizes: string[]; requirements: string[];
  schedule: ScheduleItem[];
  organizer: string; organizerContact: string;
  tags: string[]; createdAt: string;
}
export interface EventRegistration { id: string; eventId: string; userId: string; teamName?: string; registeredAt: string; paymentStatus?: string; }

export interface Payment {
  id: string; userId: string;
  entityType: "camp" | "event" | "game" | "booking";
  entityId: string;
  razorpayOrderId: string; razorpayPaymentId?: string;
  amount: number; currency: string;
  status: "created" | "paid" | "failed" | "refunded";
  createdAt: string; paidAt?: string;
}

export interface DB {
  users: User[]; coaches: Coach[]; games: Game[];
  gamePlayers: GamePlayer[]; waitlist: WaitlistEntry[];
  bookings: Booking[]; reviews: Review[];
  camps: Camp[]; campRegistrations: CampRegistration[];
  events: SportEvent[]; eventRegistrations: EventRegistration[];
  payments: Payment[];
}

export function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function load(): DB {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) { const s = seed(); fs.writeFileSync(DB_FILE, JSON.stringify(s, null, 2)); return s; }
    const d = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
    if (!d.camps?.length) { const s = seed(); d.camps = s.camps; d.events = s.events; }
    if (!d.campRegistrations) d.campRegistrations = [];
    if (!d.eventRegistrations) d.eventRegistrations = [];
    if (!d.payments) d.payments = [];
    // migrate coach status
    d.coaches = d.coaches.map(c => ({ ...c, status: c.status ?? "active" }));
    // migrate user new fields
    d.users = d.users.map(u => ({ ...u, sports: u.sports ?? [], phone: u.phone ?? "" }));
    return d;
  } catch { return seed(); }
}
function save(db: DB) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
let _db: DB | null = null;
export function getDB(): DB { if (!_db) _db = load(); return _db; }
export function saveDB(db: DB) { _db = db; save(db); }

function seed(): DB {
  const now = new Date();
  const hash = bcrypt.hashSync("password123", 10);
  const d = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();

  const users: User[] = [
    { id: "u_demo",  email: "demo@gameground.com",  name: "Arjun Sharma",  username: "arjuns",    passwordHash: hash, role: "player", location: "Kozhikode, Kerala", bio: "Basketball enthusiast. Love organizing weekend games!", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=arjun", phone: "+91 98765 11111", sports: ["Basketball","Football"], reliabilityScore: 4.8, gamesPlayed: 23, gamesOrganized: 6, attendanceRate: 96, createdAt: d(-90) },
    { id: "u_priya", email: "priya@gridgame.com", name: "Priya Menon",   username: "priyam",    passwordHash: hash, role: "player", location: "Calicut, Kerala",    bio: "Football and badminton player.",                      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya", phone: "+91 87654 22222", sports: ["Football","Badminton"], reliabilityScore: 4.9, gamesPlayed: 31, gamesOrganized: 8, attendanceRate: 98, createdAt: d(-120) },
    { id: "u_rahul", email: "rahul@gridgame.com", name: "Rahul Nair",    username: "rahulnair", passwordHash: hash, role: "player", location: "Kozhikode, Kerala", bio: "Cricket and volleyball weekend warrior.",               avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=rahul", phone: "+91 76543 33333", sports: ["Cricket","Volleyball"], reliabilityScore: 4.5, gamesPlayed: 14, gamesOrganized: 2, attendanceRate: 89, createdAt: d(-60) },
    { id: "u_admin", email: "admin@gameground.com", name: "Game Ground Admin", username: "admin",   passwordHash: bcrypt.hashSync("admin123", 10), role: "admin", reliabilityScore: 5, gamesPlayed: 0, gamesOrganized: 0, attendanceRate: 100, createdAt: d(-200) },
  ];

  const coaches: Coach[] = [
    { id: "c_1", name: "Elite Basketball Academy", sport: "Basketball", type: "Academy", skillLevel: "All Levels", price: "₹1,200–2,000/session", priceMin: 1200, priceMax: 2000, timing: "Mon–Fri, 6–8 PM", location: "SM Street, Kozhikode", address: "Sports Complex, SM Street, Kozhikode 673001", phone: "+91 98765 43210", email: "info@elitebasketball.com", description: "Kozhikode's premier basketball academy with BSFI-certified coaches.", features: ["BSFI-certified coaches","Full-size indoor court","Video analysis","Personalized plans","Max 15 per batch","Monthly assessments"], imageUrl: "https://images.unsplash.com/photo-1546519638399-1274d96f2a0a?w=800&q=80", rating: 4.8, reviewCount: 47, totalSeats: 15, seatsLeft: 4, status: "active", batches: [{id:"b_1a",coachId:"c_1",day:"Mon–Wed–Fri",time:"6:00 AM–8:00 AM",level:"Advanced",seats:2},{id:"b_1b",coachId:"c_1",day:"Mon–Fri",time:"6:00 PM–8:00 PM",level:"All Levels",seats:4},{id:"b_1c",coachId:"c_1",day:"Tue–Thu",time:"7:00 PM–9:00 PM",level:"Beginner",seats:6},{id:"b_1d",coachId:"c_1",day:"Sat–Sun",time:"9:00 AM–12:00 PM",level:"Intermediate",seats:0}], lat: 11.2588, lng: 75.7804 },
    { id: "c_2", name: "Kerala Football School", sport: "Football", type: "Academy", skillLevel: "Intermediate", price: "₹800–1,500/session", priceMin: 800, priceMax: 1500, timing: "Tue–Thu, 5–7 PM", location: "EMS Stadium, Kozhikode", address: "EMS Corporation Stadium, Kozhikode 673001", phone: "+91 87654 32109", email: "coach@keralafs.com", description: "Former I-League players coaching the next generation.", features: ["Ex-professional coaches","Full-size grass pitch","Fitness & agility","Match analysis","Position-specific drills","Weekly scrimmages"], imageUrl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80", rating: 4.9, reviewCount: 63, totalSeats: 20, seatsLeft: 7, status: "active", batches: [{id:"b_2a",coachId:"c_2",day:"Tue–Thu",time:"5:00 PM–7:00 PM",level:"Intermediate",seats:7},{id:"b_2b",coachId:"c_2",day:"Sat",time:"8:00 AM–10:00 AM",level:"All Levels",seats:9}] },
    { id: "c_3", name: "Calicut Badminton Club", sport: "Badminton", type: "Academy", skillLevel: "Beginner", price: "₹600–1,000/session", priceMin: 600, priceMax: 1000, timing: "Mon–Sat, 6–9 PM", location: "Indoor Sports Hall, West Hill", address: "West Hill Indoor Sports Hall, Kozhikode 673005", phone: "+91 76543 21098", email: "play@calicutbadminton.com", description: "BAI-affiliated academy with 8 professional courts.", features: ["BAI-affiliated coaches","8 professional courts","Equipment provided","Video stroke analysis","Beginner-friendly","Monthly tournaments"], imageUrl: "https://images.unsplash.com/photo-1613918431703-aa50889e3be8?w=800&q=80", rating: 4.7, reviewCount: 38, totalSeats: 20, seatsLeft: 9, status: "active", batches: [{id:"b_3a",coachId:"c_3",day:"Mon–Fri",time:"6:00 PM–8:00 PM",level:"Beginner",seats:9},{id:"b_3b",coachId:"c_3",day:"Sat–Sun",time:"7:00 AM–9:00 AM",level:"Advanced",seats:3}] },
    { id: "c_4", name: "Cricket Academy Kerala", sport: "Cricket", type: "Academy", skillLevel: "All Levels", price: "₹900–1,600/session", priceMin: 900, priceMax: 1600, timing: "Weekends, 7 AM–12 PM", location: "Nehru Stadium Ground", address: "Nehru Stadium, Kozhikode 673001", phone: "+91 65432 10987", email: "coach@cak.in", description: "BCCI-certified coaches producing district and state-level players.", features: ["BCCI-certified coaches","Full-size turf ground","Net practice","Batting & bowling machines","Sports psychology","Annual tournament"], imageUrl: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80", rating: 4.9, reviewCount: 89, totalSeats: 25, seatsLeft: 0, status: "active", batches: [{id:"b_4a",coachId:"c_4",day:"Sat–Sun",time:"7:00 AM–12:00 PM",level:"All Levels",seats:0}] },
    { id: "c_5", name: "FitPro Personal Training", sport: "Fitness", type: "Personal Trainer", skillLevel: "All Levels", price: "₹700–1,200/session", priceMin: 700, priceMax: 1200, timing: "Daily, 6–10 AM & 5–9 PM", location: "Gold's Gym, Mavoor Road", address: "Gold's Gym, Mavoor Road, Kozhikode 673004", phone: "+91 54321 09876", email: "train@fitpro.in", description: "Certified personal trainers specializing in sports conditioning.", features: ["Certified trainers","Modern equipment","Custom plans","Nutrition guidance","Body composition tracking","Recovery sessions"], imageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80", rating: 5.0, reviewCount: 34, totalSeats: 10, seatsLeft: 5, status: "active", batches: [{id:"b_5a",coachId:"c_5",day:"Daily",time:"6:00 AM–7:00 AM",level:"All Levels",seats:2},{id:"b_5b",coachId:"c_5",day:"Daily",time:"7:00 AM–8:00 AM",level:"Intermediate",seats:3}] },
    { id: "c_6", name: "Kozhikode Tennis Academy", sport: "Tennis", type: "Academy", skillLevel: "Advanced", price: "₹1,500–2,500/session", priceMin: 1500, priceMax: 2500, timing: "Weekends, 7–10 AM", location: "KSSC Tennis Courts", address: "KSSC Tennis Courts, Beach Road, Kozhikode 673032", phone: "+91 43210 98765", email: "play@koztennisacademy.com", description: "AITA-certified coaches on 6 all-weather courts.", features: ["AITA-certified coaches","6 all-weather courts","Ball machine training","Tournament preparation","Video analysis","Physical conditioning"], imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80", rating: 4.7, reviewCount: 26, totalSeats: 12, seatsLeft: 3, status: "active", batches: [{id:"b_6a",coachId:"c_6",day:"Sat–Sun",time:"7:00 AM–9:00 AM",level:"Advanced",seats:3},{id:"b_6b",coachId:"c_6",day:"Sat–Sun",time:"9:00 AM–11:00 AM",level:"Intermediate",seats:5}] },
  ];

  const games: Game[] = [
    { id:"g_1",sport:"Basketball",title:"5v5 Pickup at SM Street",location:"SM Street Court",address:"SM Street, Kozhikode 673001",scheduledAt:d(0.2),duration:90,slots:10,slotsLeft:3,skillLevel:"Intermediate",organizerId:"u_demo",cost:"Free",costAmount:0,description:"Friendly 5v5 pickup game.",rules:["Arrive 10 min early","Bring water","Basketball shoes required"],imageUrl:"https://images.unsplash.com/photo-1546519638399-1274d96f2a0a?w=800&q=80",status:"open",createdAt:d(-2) },
    { id:"g_2",sport:"Football",title:"Evening 7-a-side at EMS Stadium",location:"EMS Stadium Ground",address:"EMS Stadium, Kozhikode 673001",scheduledAt:d(1),duration:120,slots:14,slotsLeft:6,skillLevel:"All Levels",organizerId:"u_priya",cost:"₹100",costAmount:100,description:"Fun evening 7-a-side.",rules:["All levels welcome","Bring shin guards","₹100 for ground rental"],imageUrl:"https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",status:"open",createdAt:d(-1) },
    { id:"g_3",sport:"Badminton",title:"Casual Doubles — West Hill",location:"West Hill Indoor Hall",address:"West Hill, Kozhikode 673005",scheduledAt:new Date(now.getTime()+3*3600000).toISOString(),duration:60,slots:8,slotsLeft:2,skillLevel:"Beginner",organizerId:"u_rahul",cost:"Free",costAmount:0,description:"Casual doubles. Equipment provided.",rules:["Beginners welcome","Equipment provided","Non-marking shoes"],imageUrl:"https://images.unsplash.com/photo-1613918431703-aa50889e3be8?w=800&q=80",status:"open",createdAt:d(0) },
    { id:"g_4",sport:"Cricket",title:"Sunday T20 — Nehru Stadium",location:"Nehru Stadium",address:"Nehru Stadium, Kozhikode 673001",scheduledAt:d(2),duration:240,slots:22,slotsLeft:0,skillLevel:"Intermediate",organizerId:"u_priya",cost:"₹150",costAmount:150,description:"Full 20-over T20. Game is FULL.",rules:["20 overs per side","Bring batting gear"],imageUrl:"https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",status:"full",createdAt:d(-5) },
    { id:"g_5",sport:"Basketball",title:"Morning Hoops — Community Center",location:"Community Sports Center",address:"Mavoor Road, Kozhikode",scheduledAt:d(0.7),duration:90,slots:12,slotsLeft:7,skillLevel:"All Levels",organizerId:"u_rahul",cost:"Free",costAmount:0,description:"Morning basketball. All levels.",rules:["3v3 half-court","Bring water"],imageUrl:"https://images.unsplash.com/photo-1546519638399-1274d96f2a0a?w=800&q=80",status:"open",createdAt:d(0) },
    { id:"g_6",sport:"Football",title:"Weekday 5-a-side — Beach Road",location:"Beach Road Mini Pitch",address:"Beach Road, Kozhikode 673032",scheduledAt:d(0.4),duration:60,slots:10,slotsLeft:4,skillLevel:"Advanced",organizerId:"u_demo",cost:"₹80",costAmount:80,description:"Fast-paced 5-a-side for advanced players.",rules:["Advanced only","₹80 pitch fee","3-touch rule"],imageUrl:"https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",status:"open",createdAt:d(0) },
  ];

  const gamePlayers: GamePlayer[] = [
    {id:"gp_1",gameId:"g_1",userId:"u_demo",joinedAt:d(-1)},
    {id:"gp_2",gameId:"g_1",userId:"u_priya",joinedAt:d(-0.8)},
    {id:"gp_3",gameId:"g_1",userId:"u_rahul",joinedAt:d(-0.4)},
    {id:"gp_4",gameId:"g_2",userId:"u_priya",joinedAt:d(-0.5)},
    {id:"gp_5",gameId:"g_2",userId:"u_demo",joinedAt:d(-0.3)},
    {id:"gp_6",gameId:"g_5",userId:"u_rahul",joinedAt:d(-0.2)},
    {id:"gp_7",gameId:"g_6",userId:"u_demo",joinedAt:d(-0.1)},
  ];

  const reviews: Review[] = [
    {id:"r_1",userId:"u_demo",coachId:"c_1",rating:5,text:"Excellent coaching! Improved my shooting significantly in 2 months.",reviewerName:"Arjun Sharma",createdAt:d(-20)},
    {id:"r_2",userId:"u_priya",coachId:"c_1",rating:5,text:"Best basketball academy in Kozhikode.",reviewerName:"Priya Menon",createdAt:d(-35)},
    {id:"r_3",userId:"u_rahul",coachId:"c_2",rating:5,text:"Coaches are ex-professionals. Technique improved massively.",reviewerName:"Rahul Nair",createdAt:d(-15)},
    {id:"r_4",userId:"u_demo",coachId:"c_3",rating:4,text:"Great badminton coaching. Footwork drills very effective.",reviewerName:"Arjun Sharma",createdAt:d(-40)},
    {id:"r_5",userId:"u_priya",coachId:"c_5",rating:5,text:"Lost 6kg in 2 months! Incredible trainer.",reviewerName:"Priya Menon",createdAt:d(-10)},
  ];

  const camps: Camp[] = [
    { id:"camp_1",title:"Elite Basketball Summer Camp",sport:"Basketball",duration:"5 Days",dates:"June 15–19, 2026",startDate:d(15),endDate:d(20),registrationDeadline:d(10),location:"SM Street Sports Academy",address:"Sports Complex, SM Street, Kozhikode 673001",distance:"2.3 km",price:4500,priceDisplay:"₹4,500",ageGroup:"13–18 years",skillLevel:"All Levels",rating:4.9,reviews:87,participants:18,maxParticipants:25,featured:true,status:"open",description:"Transform your game in 5 days! Intensive training with professional coaches.",highlights:["Professional coaching","Video analysis","Competition play","Certificate"],included:["BSFI-certified coaching","Video analysis of gameplay","Camp jersey and basketball","Daily lunch","Certificate of completion","Small group sessions (max 8)"],whatToBring:["Basketball shoes","Athletic wear","Water bottle","Towel"],coaches:[{name:"Coach Vinod Kumar",experience:"15 years",specialty:"Shooting & Scoring"},{name:"Coach Priya Nair",experience:"12 years",specialty:"Defense & Fundamentals"}],dailySchedule:[{time:"8:00–9:00 AM",activity:"Warm-up & Conditioning"},{time:"9:00–11:00 AM",activity:"Fundamental Skills Training"},{time:"11:00 AM–12 PM",activity:"Position-Specific Drills"},{time:"12:00–1:00 PM",activity:"Lunch Break"},{time:"1:00–2:30 PM",activity:"Game Strategy & Tactics"},{time:"2:30–4:00 PM",activity:"Scrimmage & Live Play"}],testimonials:[{name:"Adithya Krishnan",age:16,text:"Best camp ever! Improved my shooting percentage in just one week.",rating:5},{name:"Meera Pillai",age:15,text:"Learned so much about game strategy. Now starting point guard on my school team!",rating:5}],imageUrl:"https://images.unsplash.com/photo-1546519638399-1274d96f2a0a?w=800&q=80",tags:["Basketball","Teens","Certified","Summer"],organizer:"Elite Basketball Academy",organizerContact:"+91 98765 43210",createdAt:d(-5) },
    { id:"camp_2",title:"Football Development Camp",sport:"Football",duration:"7 Days",dates:"June 22–28, 2026",startDate:d(22),endDate:d(29),registrationDeadline:d(14),location:"EMS Stadium Ground",address:"EMS Corporation Stadium, Kozhikode 673001",distance:"1.5 km",price:3800,priceDisplay:"₹3,800",ageGroup:"10–16 years",skillLevel:"Intermediate",rating:4.8,reviews:124,participants:32,maxParticipants:40,featured:true,status:"open",description:"7-day football development program with ex-I-League professionals.",highlights:["Daily training","Tactical sessions","Friendly matches","Gear included"],included:["Ex-I-League coaches","Full-size grass pitch","Position-specific coaching","Teamwork workshops","Match-day experience"],whatToBring:["Football boots","Shin guards","Athletic wear","Water bottle"],coaches:[{name:"Coach Saji Thomas",experience:"I-League veteran, 14 years",specialty:"Attacking Play & Finishing"}],dailySchedule:[{time:"7:00–7:30 AM",activity:"Warm-up & Stretching"},{time:"7:30–9:00 AM",activity:"Technical Drills"},{time:"9:00–10:00 AM",activity:"Tactical Workshop"},{time:"10:30 AM–12 PM",activity:"Small-sided Games"}],testimonials:[{name:"Faris Ahamed",age:14,text:"My ball control improved dramatically. Coach Saji explains everything so clearly!",rating:5}],imageUrl:"https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",tags:["Football","Kids","Summer"],organizer:"Kerala Football School",organizerContact:"+91 87654 32109",createdAt:d(-8) },
    { id:"camp_3",title:"Badminton Summer Camp",sport:"Badminton",duration:"4 Days",dates:"July 1–4, 2026",startDate:d(40),endDate:d(44),registrationDeadline:d(35),location:"West Hill Indoor Hall",address:"West Hill Indoor Sports Hall, Kozhikode 673005",distance:"1.8 km",price:2800,priceDisplay:"₹2,800",ageGroup:"6–12 years",skillLevel:"Beginner",rating:4.7,reviews:56,participants:18,maxParticipants:24,featured:false,status:"upcoming",description:"4-day introduction to badminton for young beginners. All equipment provided.",highlights:["Equipment provided","BAI-certified coaches","Air-conditioned courts","Mini-tournament final day"],included:["All equipment provided","BAI-certified coaching","Progress report","Certificate"],whatToBring:["Non-marking sports shoes","Athletic wear","Water bottle"],coaches:[{name:"Coach Sreelatha K",experience:"BAI-certified, 9 years",specialty:"Footwork & Stroke Play"}],dailySchedule:[{time:"4:00–4:30 PM",activity:"Warm-up & Footwork Basics"},{time:"4:30–5:30 PM",activity:"Stroke Technique"},{time:"5:30–6:00 PM",activity:"Court Games & Rallies"}],testimonials:[{name:"Parent of Rahul",age:9,text:"My son went from zero to playing proper rallies in 4 days!",rating:5}],imageUrl:"https://images.unsplash.com/photo-1613918431703-aa50889e3be8?w=800&q=80",tags:["Badminton","Kids","Indoor"],organizer:"Calicut Badminton Club",organizerContact:"+91 76543 21098",createdAt:d(-10) },
    { id:"camp_4",title:"Junior Cricket Academy Camp",sport:"Cricket",duration:"14 Days",dates:"July 15–28, 2026",startDate:d(55),endDate:d(69),registrationDeadline:d(45),location:"Nehru Stadium Ground",address:"Nehru Stadium, Kozhikode 673001",distance:"4.2 km",price:6500,priceDisplay:"₹6,500",ageGroup:"12–18 years",skillLevel:"Intermediate",rating:4.9,reviews:98,participants:21,maxParticipants:30,featured:true,status:"upcoming",description:"14-day intensive cricket development camp with BCCI-certified coaches.",highlights:["BCCI-certified coaching","Batting machine sessions","Spin bowling masterclass","Selection trials on final day"],included:["BCCI-certified coaching","Full turf pitch","Batting machine","Sports psychology","Kit bag provided","Certificate"],whatToBring:["Cricket whites","Personal bat & helmet","Spikes","Water bottle"],coaches:[{name:"Coach Sreejith Varma",experience:"BCCI Level 2, 16 years",specialty:"Batting & Shot Selection"},{name:"Coach Binu George",experience:"District level spinner, 12 years",specialty:"Spin Bowling"}],dailySchedule:[{time:"7:00–8:00 AM",activity:"Conditioning & Fitness"},{time:"8:00–10:00 AM",activity:"Batting Practice (Nets)"},{time:"10:00–11:00 AM",activity:"Bowling Drills"},{time:"11:00 AM–12 PM",activity:"Fielding & Catching"},{time:"1:00–3:00 PM",activity:"Match Simulation"}],testimonials:[{name:"Suresh Pillai's Dad",age:15,text:"My son got shortlisted for district trials after this camp!",rating:5}],imageUrl:"https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",tags:["Cricket","Teens","Intensive","BCCI"],organizer:"Cricket Academy Kerala",organizerContact:"+91 65432 10987",createdAt:d(-3) },
    { id:"camp_5",title:"Multi-Sport Adventure Camp",sport:"Multi-Sport",duration:"10 Days",dates:"August 5–14, 2026",startDate:d(76),endDate:d(86),registrationDeadline:d(68),location:"Community Sports Center",address:"Mavoor Road, Kozhikode",distance:"2.1 km",price:5200,priceDisplay:"₹5,200",ageGroup:"8–14 years",skillLevel:"All Levels",rating:4.7,reviews:203,participants:38,maxParticipants:60,featured:false,status:"upcoming",description:"10 days, 5+ sports! Fun-first approach with friendly coaches.",highlights:["5+ sports in 10 days","Team building","Outdoor adventures","Full supervision"],included:["All equipment","5 coaches","Snacks","Group activities","Medal ceremony","Sibling discount"],whatToBring:["Sports shoes","Multiple athletic wear sets","Water bottle","Cap"],coaches:[{name:"Coach Anoop Raj",experience:"Multi-sport specialist, 11 years",specialty:"Athletics & Fitness Games"}],dailySchedule:[{time:"9:00–9:30 AM",activity:"Morning Assembly"},{time:"9:30–11:00 AM",activity:"Sport 1 Session"},{time:"11:15 AM–1 PM",activity:"Sport 2 Session"},{time:"2:00–3:30 PM",activity:"Team Challenge"}],testimonials:[{name:"Riya's Mom",age:10,text:"She discovered she loves badminton! Amazing camp.",rating:5}],imageUrl:"https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80",tags:["Multi-Sport","Kids","Fun"],organizer:"Game Ground",organizerContact:"hello@gameground.com",createdAt:d(-2) },
  ];

  const events: SportEvent[] = [
    { id:"ev_1",title:"Kozhikode Basketball Championship 2026",sport:"Basketball",type:"Tournament",date:"April 15–17, 2026",startDate:new Date(now.getTime()-2*3600000).toISOString(),endDate:new Date(now.getTime()+10*3600000).toISOString(),registrationDeadline:d(-8),location:"SM Street Indoor Arena",address:"SM Street Sports Complex, Kozhikode 673001",distance:"2.3 km",participants:128,maxParticipants:150,prizePool:"₹50,000",entryFee:"₹500",entryFeeAmount:500,difficulty:"Advanced",featured:true,status:"Live",description:"The most prestigious basketball tournament in Kozhikode. 3-day championship with 16 teams.",format:["Pool stage — 4 groups of 8 teams","Top 2 from each group advance","Single-elimination quarterfinals","Semi-finals and Grand Final on Day 3","Each game: 4×10 minutes FIBA rules"],prizes:["🥇 1st Place: ₹25,000 + Trophy","🥈 2nd Place: ₹15,000 + Trophy","🥉 3rd Place: ₹10,000 + Trophy","🏆 MVP Award: ₹3,000","🛡️ Best Defensive Player: ₹2,000"],requirements:["Team of 5–10 players","Minimum age: 16 years","Valid ID for all players","Medical fitness proof"],schedule:[{day:"Day 1 (Today)",time:"8:00 AM – 8:00 PM",event:"Pool Stage — Groups A & B"},{day:"Day 2",time:"8:00 AM – 8:00 PM",event:"Pool Stage Groups C & D + Quarterfinals"},{day:"Day 3",time:"9:00 AM – 6:00 PM",event:"Semi-finals, Finals + Prize Ceremony"}],imageUrl:"https://images.unsplash.com/photo-1546519638399-1274d96f2a0a?w=800&q=80",tags:["Tournament","Basketball","Live","Prize Money"],organizer:"Elite Basketball Academy",organizerContact:"+91 98765 43210",createdAt:d(-20) },
    { id:"ev_2",title:"Marathon Run For Health 2026",sport:"Running",type:"Marathon",date:"April 22, 2026",startDate:d(11),endDate:d(11),registrationDeadline:d(8),location:"Kozhikode Beach Road",address:"Beach, Kozhikode 673032",distance:"1.5 km",participants:845,maxParticipants:1000,prizePool:"₹1,00,000",entryFee:"₹300",entryFeeAmount:300,difficulty:"All Levels",featured:true,status:"Registration Open",description:"Kozhikode's biggest annual marathon! 5K, 10K, and 21K routes along the Malabar coastline.",format:["5K Fun Run — open to all ages","10K Run — 16+ years","21K Half Marathon — adults 18+","Timing chips for all runners","Water stations every 2.5 km"],prizes:["🥇 21K Winners (M/W): ₹20,000 each","🥈 21K 2nd Place: ₹12,000 each","🥉 21K 3rd Place: ₹8,000 each","🏅 Age category prizes in 10K","🎖️ All finishers receive medals"],requirements:["Registration with timing chip","Medical fitness declaration","Appropriate running shoes","Bib must be visible"],schedule:[{day:"Race Day",time:"5:00 AM",event:"Start — 21K Half Marathon"},{day:"Race Day",time:"6:00 AM",event:"Start — 10K Run"},{day:"Race Day",time:"7:00 AM",event:"Start — 5K Fun Run"},{day:"Race Day",time:"10:00 AM",event:"Prize Ceremony & Refreshments"}],imageUrl:"https://images.unsplash.com/photo-1541889413457-4aec9b418977?w=800&q=80",tags:["Marathon","Running","Health"],organizer:"Kozhikode Sports Club",organizerContact:"+91 91234 56789",createdAt:d(-14) },
    { id:"ev_3",title:"Summer Football Festival",sport:"Football",type:"Festival",date:"May 5–7, 2026",startDate:d(24),endDate:d(26),registrationDeadline:d(18),location:"EMS Stadium, Kozhikode",address:"EMS Corporation Stadium, Kozhikode 673001",distance:"3.8 km",participants:256,maxParticipants:300,prizePool:"₹80,000",entryFee:"₹400",entryFeeAmount:400,difficulty:"Intermediate",featured:true,status:"Registration Open",description:"Kerala's biggest summer football festival! 5-a-side and 7-a-side under floodlights.",format:["5-a-side tournament (Day 1 & 2)","7-a-side tournament (Day 1 & 2)","Finals and Festival Day (Day 3)","Separate male, female, and mixed categories"],prizes:["🥇 5-a-side Champions: ₹20,000","🥇 7-a-side Champions: ₹30,000","🏆 Top Scorer: ₹5,000","🛡️ Best Goalkeeper: ₹5,000"],requirements:["Team of 5 or 7","Minimum age 16","Valid ID","Shin guards mandatory"],schedule:[{day:"Day 1",time:"4:00–10:00 PM",event:"5-a-side Group Stage"},{day:"Day 2",time:"4:00–10:00 PM",event:"7-a-side Group Stage + 5-a-side Knockouts"},{day:"Day 3",time:"3:00–9:00 PM",event:"All Finals + Prize Ceremony + Live Music"}],imageUrl:"https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",tags:["Festival","Football","Prize Money"],organizer:"Kerala Football School",organizerContact:"+91 87654 32109",createdAt:d(-12) },
    { id:"ev_4",title:"Tennis Grand Prix — Kozhikode Open",sport:"Tennis",type:"Tournament",date:"May 10–12, 2026",startDate:d(29),endDate:d(31),registrationDeadline:d(22),location:"KSSC Tennis Courts",address:"KSSC Tennis Courts, Beach Road, Kozhikode 673032",distance:"2.1 km",participants:58,maxParticipants:64,prizePool:"₹1,50,000",entryFee:"₹750",entryFeeAmount:750,difficulty:"Advanced",featured:false,status:"Registration Open",description:"Kerala's premier tennis tournament on 6 AITA-certified all-weather courts.",format:["Men's and Women's singles (32-player draws)","Men's doubles (16 pair draw)","AITA ranking points awarded","Best-of-3 sets (best-of-5 in final)"],prizes:["🥇 Singles Winners (M/W): ₹40,000 each","🥈 Singles Runner-Up: ₹25,000 each","🥇 Doubles Champions: ₹25,000 per pair"],requirements:["AITA registration recommended","Valid ID","Own racket required","Minimum age: 16 years"],schedule:[{day:"Day 1",time:"8:00 AM – 7:00 PM",event:"Singles R32 + Doubles R16"},{day:"Day 2",time:"8:00 AM – 7:00 PM",event:"Singles R16 + QF, Doubles SF"},{day:"Day 3",time:"9:00 AM – 6:00 PM",event:"SF + Finals + Prize Ceremony"}],imageUrl:"https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",tags:["Tournament","Tennis","AITA"],organizer:"Kozhikode Tennis Academy",organizerContact:"+91 43210 98765",createdAt:d(-6) },
    { id:"ev_5",title:"Malabar Cricket Premier League",sport:"Cricket",type:"League",date:"May 20 – June 10, 2026",startDate:d(39),endDate:d(60),registrationDeadline:d(32),location:"Nehru Stadium Ground",address:"Nehru Stadium, Kozhikode 673001",distance:"4.2 km",participants:180,maxParticipants:200,prizePool:"₹1,20,000",entryFee:"₹3,000",entryFeeAmount:3000,difficulty:"Intermediate",featured:false,status:"Registration Open",description:"The prestigious Malabar Cricket Premier League — 20 teams, T20 format.",format:["20 teams in 4 groups of 5","Top 2 from each group advance","T20 format — 20 overs per side","DLS method for rain interruptions"],prizes:["🥇 Champions: ₹60,000 + Trophy","🥈 Runners-up: ₹30,000 + Trophy","🏆 Man of Tournament: ₹10,000"],requirements:["Team of 11 + 4 substitutes","All players' ID proof","White cricket kit for finals"],schedule:[{day:"Weekends 1–3",time:"7:00 AM – 6:00 PM",event:"Group Stage"},{day:"Weekend 4",time:"7:00 AM – 6:00 PM",event:"Quarter-finals"},{day:"Weekend 5",time:"8:00 AM – 6:00 PM",event:"Semi-finals + Grand Final + Awards"}],imageUrl:"https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",tags:["League","Cricket","T20"],organizer:"Cricket Academy Kerala",organizerContact:"+91 65432 10987",createdAt:d(-10) },
    { id:"ev_6",title:"Community Sports Carnival 2026",sport:"Multi-Sport",type:"Festival",date:"May 1–2, 2026",startDate:d(20),endDate:d(21),registrationDeadline:d(16),location:"Mananchira Ground, Kozhikode",address:"Mananchira Square, Kozhikode 673001",distance:"1.8 km",participants:412,maxParticipants:500,prizePool:"Prizes & Trophies",entryFee:"Free",entryFeeAmount:0,difficulty:"All Levels",featured:true,status:"Registration Open",description:"Kozhikode's annual community sports carnival — two days of fun for the whole family!",format:["Open competitions in 6 sports","Age categories for all events","Team and individual events","Free entry — registration required"],prizes:["🏅 Gold, Silver, Bronze in all sports","🏆 Overall Champion Community award","🎖️ Most Spirited Team Trophy","🌟 Young Athlete of the Year"],requirements:["Free registration required","Bring valid ID","All ages and skill levels welcome"],schedule:[{day:"Day 1 (Morning)",time:"8:00 AM – 1:00 PM",event:"Football, Athletics & Badminton Heats"},{day:"Day 1 (Evening)",time:"3:00 PM – 8:00 PM",event:"Basketball Tournament"},{day:"Day 2 (Morning)",time:"8:00 AM – 1:00 PM",event:"All Finals"},{day:"Day 2 (Evening)",time:"4:00–7:00 PM",event:"Prize Ceremony + Closing"}],imageUrl:"https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80",tags:["Festival","Multi-Sport","Free Entry","Family"],organizer:"Kozhikode Sports Council",organizerContact:"+91 94567 89012",createdAt:d(-9) },
  ];

  return { users, coaches, games, gamePlayers, waitlist:[], bookings:[], reviews, camps, campRegistrations:[], events, eventRegistrations:[], payments:[] };
}
