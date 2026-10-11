/**
 * Seeds a SMALL starter dataset of well-known official programmes and helplines.
 *
 * IMPORTANT: every record is saved with verified=false and a sourceUrl. Details such as phone numbers,
 * eligibility and deadlines change. Before launch, open each sourceUrl, confirm the record, then mark
 * it verified in the admin panel. Deadlines are intentionally left empty rather than guessed.
 */
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { Opportunity } from './models/Opportunity';
import { SupportResource } from './models/SupportResource';
import { User } from './models/User';
import mongoose from 'mongoose';

const resources = [
  {
    name: 'Emergency Response Support System (ERSS)', categories: ['emergency', 'general', 'domestic_abuse', 'harassment', 'cyber_harassment'],
    description: 'India\'s single emergency number for police, fire and ambulance. Call if you or someone else is in immediate danger.',
    phone: '112', type: 'helpline', availability: 'Round the clock (as publicly described)', sourceUrl: 'https://112.gov.in', website: 'https://112.gov.in',
  },
  {
    name: 'Women Helpline (181)', categories: ['emergency', 'domestic_abuse', 'harassment', 'workplace', 'general', 'financial_abuse'],
    description: 'Government of India helpline for women affected by violence, offering information and referral to services such as police, legal aid and support centres.',
    phone: '181', type: 'helpline', availability: 'Round the clock (as publicly described)', sourceUrl: 'https://wcd.gov.in',
  },
  {
    name: 'National Cyber Crime Reporting Portal', categories: ['cyber_harassment', 'harassment', 'financial_abuse'],
    description: 'Official portal to report cyber crimes, including online harassment, stalking and financial fraud. A helpline number is available for reporting financial cyber fraud.',
    phone: '1930', website: 'https://cybercrime.gov.in', sourceUrl: 'https://cybercrime.gov.in', type: 'online_portal',
  },
  {
    name: 'SHe-Box (Sexual Harassment electronic Box)', categories: ['workplace', 'harassment'],
    description: 'Online complaint management portal from the Ministry of Women and Child Development for reporting workplace sexual harassment.',
    website: 'https://shebox.wcd.gov.in', sourceUrl: 'https://shebox.wcd.gov.in', type: 'online_portal',
  },
  {
    name: 'National Commission for Women (NCW)', categories: ['harassment', 'discrimination', 'domestic_abuse', 'workplace', 'general'],
    description: 'Statutory body that works on women\'s rights. Its website explains how to file a complaint and lists contact options.',
    website: 'https://ncw.gov.in', sourceUrl: 'https://ncw.gov.in', type: 'government',
  },
  {
    name: 'National Legal Services Authority (NALSA)', categories: ['general', 'domestic_abuse', 'harassment', 'workplace', 'discrimination', 'financial_abuse', 'education'],
    description: 'Provides free legal services to eligible people, including women, through state and district legal services authorities. Check the website to find your nearest authority.',
    website: 'https://nalsa.gov.in', sourceUrl: 'https://nalsa.gov.in', type: 'government',
  },
  {
    name: 'Tele-MANAS (Tele Mental Health Assistance)', categories: ['emergency', 'general', 'domestic_abuse', 'harassment'],
    description: 'Free national tele mental health support service run by the Government of India.',
    phone: '14416', website: 'https://telemanas.mohfw.gov.in', sourceUrl: 'https://telemanas.mohfw.gov.in', type: 'helpline',
  },
].map((r) => ({ location: 'India', verified: false, ...r }));

const base = { location: 'India', mode: 'onsite', verified: false, active: true, requiredDocuments: [] as string[] };
const opportunities = [
  {
    title: 'National Scholarship Portal (NSP)', organization: 'Government of India', category: 'scholarship',
    description: 'A one-stop portal where students can find and apply for many central and state scholarships. Available schemes and eligibility differ, so check each scheme\'s own page.',
    eligibility: { summary: 'Varies by scheme. Check the scheme guidelines on the portal.' },
    applicationUrl: 'https://scholarships.gov.in', sourceUrl: 'https://scholarships.gov.in', tags: ['scholarships', 'students', 'education'],
  },
  {
    title: 'AICTE Pragati Scholarship for Girls', organization: 'AICTE', category: 'scholarship',
    description: 'A scholarship scheme aimed at girl students pursuing technical education at AICTE-approved institutions. Confirm the current guidelines, income criteria and application window on official sources.',
    eligibility: { summary: 'Aimed at girl students in AICTE-approved technical programmes. Confirm current criteria officially.', educationLevels: ['Diploma', 'Undergraduate'] },
    applicationUrl: 'https://scholarships.gov.in', sourceUrl: 'https://www.aicte-india.org', tags: ['engineering', 'technology', 'women', 'students'],
  },
  {
    title: 'PM Internship Scheme', organization: 'Ministry of Corporate Affairs, Government of India', category: 'internship',
    description: 'A government internship initiative connecting young people with internship opportunities at companies. Check the official portal for current eligibility and the application process.',
    eligibility: { summary: 'Check the official portal for current eligibility.' },
    applicationUrl: 'https://pminternship.mca.gov.in', sourceUrl: 'https://pminternship.mca.gov.in', tags: ['internship', 'students', 'business'],
  },
  {
    title: 'National Career Service (NCS) Portal', organization: 'Ministry of Labour & Employment', category: 'job',
    description: 'A government job-matching and career-counselling portal for job seekers and employers.',
    eligibility: { summary: 'Open to registered job seekers.' }, mode: 'remote',
    applicationUrl: 'https://www.ncs.gov.in', sourceUrl: 'https://www.ncs.gov.in', tags: ['jobs', 'career', 'business', 'technology'],
  },
  {
    title: 'Skill India Digital Hub', organization: 'Skill India / MSDE', category: 'training',
    description: 'A digital platform to discover skilling courses and training programmes.',
    eligibility: { summary: 'Varies by course.' }, mode: 'remote',
    applicationUrl: 'https://skillindiadigital.gov.in', sourceUrl: 'https://skillindiadigital.gov.in', tags: ['skills', 'training', 'technology', 'business'],
  },
  {
    title: 'Women Entrepreneurship Platform (WEP)', organization: 'NITI Aayog', category: 'entrepreneurship',
    description: 'A platform that brings together information on resources, mentoring, funding and learning for women entrepreneurs.',
    eligibility: { summary: 'Open to aspiring and existing women entrepreneurs.' }, mode: 'remote',
    applicationUrl: 'https://wep.gov.in', sourceUrl: 'https://wep.gov.in', tags: ['entrepreneurship', 'business', 'mentorship', 'finance'],
  },
  {
    title: 'Stand-Up India Scheme', organization: 'Government of India', category: 'government',
    description: 'A scheme aimed at facilitating bank loans for women and SC/ST entrepreneurs setting up new enterprises. Confirm current loan terms and eligibility on the official portal; HerGuide has not verified your eligibility.',
    eligibility: { summary: 'Intended for women and SC/ST entrepreneurs setting up new enterprises. Verify current terms officially.' },
    applicationUrl: 'https://www.standupmitra.in', sourceUrl: 'https://www.standupmitra.in', tags: ['entrepreneurship', 'finance', 'business', 'loans'],
  },
  {
    title: 'PM MUDRA Yojana', organization: 'MUDRA / Government of India', category: 'government',
    description: 'A government initiative that provides access to institutional credit for micro and small businesses through lending institutions. Check the official site for current categories and terms.',
    eligibility: { summary: 'For non-corporate small business enterprises. Verify current terms officially.' },
    applicationUrl: 'https://www.mudra.org.in', sourceUrl: 'https://www.mudra.org.in', tags: ['entrepreneurship', 'finance', 'business', 'loans'],
  },
  {
    title: 'Women Scientists Scheme (WISE-KIRAN)', organization: 'Department of Science & Technology', category: 'returnship',
    description: 'DST programmes that support women in science and technology, including opportunities for women who have taken a career break. Check the DST website for current calls and eligibility.',
    eligibility: { summary: 'Varies by component. Check current calls on the DST website.' },
    applicationUrl: 'https://dst.gov.in', sourceUrl: 'https://dst.gov.in', tags: ['science', 'research', 'technology', 'women'],
  },
].map((o) => ({ ...base, ...o }));

async function main() {
  await connectDB();
  for (const r of resources) await SupportResource.updateOne({ name: r.name }, { $setOnInsert: r }, { upsert: true });
  for (const o of opportunities) await Opportunity.updateOne({ title: o.title, organization: o.organization }, { $setOnInsert: o }, { upsert: true });
  console.log(`Seeded ${resources.length} support resources and ${opportunities.length} opportunities (unverified, existing records untouched).`);

  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    if (ADMIN_PASSWORD.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
    const email = ADMIN_EMAIL.toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (existing) { existing.role = 'admin'; await existing.save(); console.log(`Promoted ${email} to admin.`); }
    else {
      await User.create({ name: 'Admin', email, role: 'admin', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) });
      console.log(`Created admin ${email}.`);
    }
  } else console.log('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create an admin user.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
