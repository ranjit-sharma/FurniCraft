import React, { useState } from 'react';
import { Modal } from './Modal';
import { useLanguage } from '../../context/LanguageContext';
import {
  BookOpen,
  CalendarCheck,
  IndianRupee,
  Users,
  FileDown,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  FileText,
  Lock,
  CalendarOff,
  Info,
  ExternalLink,
} from 'lucide-react';

export const ThekedarGuideModal = ({ isOpen, onClose }) => {
  const { language: currentAppLang } = useLanguage();
  const [guideLang, setGuideLang] = useState(currentAppLang === 'hi' ? 'hi' : currentAppLang === 'hinglish' ? 'hinglish' : 'en');
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'workers' | 'finance' | 'pdf' | 'search' | 'rules'
  const [searchQuery, setSearchQuery] = useState('');

  const content = {
    en: {
      badge: 'Thekedar Official Guide',
      title: 'Thekedar Master Guidebook',
      subtitle: 'Complete step-by-step instructions with real app photos for daily site management, attendance, advances, and payroll.',
      tabs: {
        attendance: 'Attendance & Codes',
        workers: 'Worker Profiles',
        finance: 'Advances & Pay Net',
        pdf: 'Monthly Attendance PDF',
        search: 'Transaction Search',
        rules: 'Golden Rules',
      },
      searchPlaceholder: 'Search guide (e.g., attendance, advance, pdf, half day, 1.5x)...',
      sections: {
        attendance: {
          title: 'Marking Daily Attendance & Shift Codes',
          badge: 'Daily Site Routine',
          desc: 'How to quickly mark your workforce attendance every day from the Dashboard or Worker Card.',
          steps: [
            {
              step: '1',
              title: 'Open Today\'s Attendance Screen',
              text: 'On your Thekedar Dashboard, scroll to "Today\'s Attendance". You will see all your active workers listed with quick tap buttons.',
            },
            {
              step: '2',
              title: 'Tap the Shift Code for each Craftsman',
              text: 'Each code automatically calculates their earnings based on their agreed daily earning rate:',
            },
          ],
          codes: [
            {
              code: '0.5',
              name: 'Half Day (0.5)',
              desc: 'Worked till lunchtime or half shift. Worker earns 50% of daily earning (e.g., ₹800 daily earning = ₹400 earned).',
              color: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300',
            },
            {
              code: '1',
              name: 'Full Day (1)',
              desc: 'Full day worked. Worker earns 100% of daily earning (e.g., ₹800 daily earning = ₹800 earned).',
              color: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300',
            },
            {
              code: '1.5',
              name: 'Dehadi + Half Overtime (1.5)',
              desc: 'Worked till 9:00 PM evening overtime. Worker earns 150% of daily earning (e.g., ₹800 daily earning = ₹1,200 earned).',
              color: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300',
            },
            {
              code: '2',
              name: 'Double Dehadi (2)',
              desc: 'Night shift / double duty till midnight. Worker earns 200% of daily earning (e.g., ₹800 daily earning = ₹1,600 earned).',
              color: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300',
            },
            {
              code: '2.5',
              name: '2.5 Shifts (2.5)',
              desc: 'Extended duty / 2.5 shifts. Worker earns 250% of daily earning (e.g., ₹800 daily earning = ₹2,000 earned).',
              color: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300',
            },
            {
              code: '3',
              name: '3 Shifts (3)',
              desc: 'Triple duty / 3 shifts. Worker earns 300% of daily earning (e.g., ₹800 daily earning = ₹2,400 earned).',
              color: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300',
            },
            {
              code: 'A',
              name: 'Absent (0)',
              desc: 'Craftsman did not report to work. ₹0 calculated for the day.',
              color: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300',
            },
            {
              code: 'On Leave',
              name: 'Approved Leave',
              desc: 'Worker is on leave. Worker is automatically excluded from today\'s active attendance counters on your dashboard.',
              color: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300',
            },
          ],
          editNote: '💡 Made a mistake? Simply tap the correct code on the same day. FurniCraft updates the existing entry immediately with zero duplicate clutter.',
        },
        workers: {
          title: 'Managing Worker Profiles & Details',
          badge: 'Workforce Hub',
          desc: 'Everything you need to know about worker balances, daily earning rates, and records.',
          highlights: [
            {
              title: 'Daily Earning (₹/day)',
              desc: 'The agreed daily rate set by you for this craftsman (e.g. ₹800/day for Mistry, ₹700/day for Helper).',
            },
            {
              title: 'Advance Balance (₹)',
              desc: 'Current outstanding cash advance (pesgi) given to the worker that is pending recovery.',
            },
            {
              title: 'Net Payable (₹)',
              desc: 'Total accumulated earnings from approved shifts minus any advance balance. This is the exact amount you owe them.',
            },
            {
              title: 'Attendance Logs',
              desc: 'Total shifts recorded for this worker. You can view full history with individual dates and earnings.',
            },
          ],
        },
        finance: {
          title: 'Giving Advances & Settling Net Earnings',
          badge: 'Cash & Payouts',
          desc: 'How to manage advances (pesgi) and settle weekly/monthly net earnings with 100% mathematical accuracy.',
          giveAdvance: {
            title: '1. Giving Advance (पेशगी देना)',
            steps: [
              'Go to Workforce (/workers) and tap on the worker card.',
              'Click the "Give Advance" button at the top.',
              'Enter the amount (e.g. ₹2,000) and choose Cash or Bank/UPI.',
              'Submit. The advance balance updates immediately on both dashboard and worker card.',
            ],
          },
          payNet: {
            title: '2. Paying Net Earnings (नेट पगार चुकाना)',
            steps: [
              'Click "Pay Net" inside the worker modal.',
              'The system automatically loads all unpaid earned shifts.',
              'You can choose how much advance to deduct (Cut Advance) and enter any room/food deduction or festival bonus.',
              'Review the final Net Cash to Pay and confirm payment.',
              'The system immediately marks those shifts as Paid & Locked, clears the deducted advance, and creates an official Payment Bill PDF receipt.',
            ],
          },
        },
        pdf: {
          title: 'Official Monthly Attendance PDF & Bills',
          badge: 'Printable Records',
          desc: 'Download clean, printable muster rolls and receipts for site records and client verification.',
          features: [
            {
              title: 'Monthly Attendance PDF',
              desc: 'Click "Monthly Attendance PDF" inside any worker modal. It generates an official PDF report showing all dates of the month, shift codes (P, Half, 1.5x, 2x), daily earnings, total dehadi count, and signature verification block.',
            },
            {
              title: 'Payment Bills & Receipts',
              desc: 'Under the "Payment Bills" tab in the worker modal, tap any bill to download the official payment slip detailing base earnings, advance deductions, and net cash paid.',
            },
          ],
        },
        search: {
          title: 'Transaction Search & Audit Lookup',
          badge: 'Payment Verification',
          desc: 'How to instantly verify any payment receipt or transaction ID.',
          steps: [
            'Go to "Transaction Search" in the navigation menu.',
            'Enter any Transaction ID (e.g. TXN-NET-xxx or TXN-DISB-xxx).',
            'View complete audit history: who paid, timestamp, payment method, exact breakdown, and download the original PDF bill anytime.',
          ],
        },
        rules: {
          title: 'Golden Operational Rules for Thekedars',
          badge: 'Best Practices',
          desc: 'Follow these essential tips to keep site finances crystal clear and avoid disputes.',
          list: [
            'Mark attendance daily: Always log shifts before the day ends so daily totals stay up to date.',
            'Always record advances in FurniCraft: Never give unrecorded cash. Entering it immediately protects your money and keeps balances transparent.',
            'Check Net Payable before paying: FurniCraft automatically calculates (Earned Amount − Advance Balance) so you never overpay.',
            'Download monthly PDFs at month-end: Keep a physical or digital copy of the muster roll for site records.',
          ],
        },
      },
    },
    hi: {
      badge: 'ठेकेदार आधिकारिक गाइड',
      title: 'ठेकेदार संपूर्ण यूज़र गाइड (मार्गदर्शिका)',
      subtitle: 'रोजाना हाजिरी, पेशगी (Advance), नेट हिसाब और बिल निकालने के लिए फोटो सहित आसान हिंदी निर्देश।',
      tabs: {
        attendance: 'हाजिरी व कोड्स',
        workers: 'कारीगर प्रोफाइल',
        finance: 'पेशगी व पगार चुकाना',
        pdf: 'मस्टर रोल PDF',
        search: 'लेन-देन सर्च',
        rules: 'जरूरी सावधानियां',
      },
      searchPlaceholder: 'गाइड में खोजें (उदा: हाजिरी, पेशगी, एडवांस, 1.5x, पीडीएफ, पगार)...',
      sections: {
        attendance: {
          title: 'रोजाना हाजिरी लगाना और शिफ्ट कोड्स',
          badge: 'रोज का काम',
          desc: 'डैशबोर्ड या कारीगर कार्ड से हर दिन कारीगरों की हाजिरी 1-क्लिक में कैसे लगाएं।',
          steps: [
            {
              step: '1',
              title: 'डैशबोर्ड पर "Today\'s Attendance" खोलें',
              text: 'अपने ठेकेदार डैशबोर्ड पर जाएं। वहां आपके सभी चालू कारीगरों की लिस्ट और हाजिरी के बटन दिखेंगे।',
            },
            {
              step: '2',
              title: 'काम के अनुसार सही कोड बटन दबाएं',
              text: 'हर कोड कारीगर की तय दैनिक कमाई दर (Daily Earning) के हिसाब से अपने आप सही कमाई जोड़ता है:',
            },
          ],
          codes: [
            {
              code: '0.5',
              name: 'आधा दिन (0.5 दिहाड़ी)',
              desc: 'दोपहर तक या आधी शिफ्ट काम किया। 50% कमाई मिलेगी (उदा: ₹800 दैनिक कमाई = ₹400 कमाई)।',
              color: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300',
            },
            {
              code: '1',
              name: 'पूरा दिन (1 दिहाड़ी)',
              desc: 'पूरा दिन काम किया। कारीगर को 100% कमाई मिलेगी (उदा: ₹800 दैनिक कमाई = ₹800 कमाई)।',
              color: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300',
            },
            {
              code: '1.5',
              name: 'डेढ़ दिहाड़ी (1.5 Overtime)',
              desc: 'शाम 9:00 बजे तक ओवरटाइम किया। 150% कमाई मिलेगी (उदा: ₹800 दैनिक कमाई = ₹1,200 कमाई)।',
              color: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300',
            },
            {
              code: '2',
              name: 'डबल दिहाड़ी / नाइट (2)',
              desc: 'रात 12:00 बजे तक या नाइट शिफ्ट काम किया। 200% कमाई मिलेगी (उदा: ₹800 दैनिक कमाई = ₹1,600 कमाई)।',
              color: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300',
            },
            {
              code: '2.5',
              name: '2.5 शिफ्ट (2.5)',
              desc: '2.5 शिफ्ट काम किया। 250% कमाई मिलेगी (उदा: ₹800 दैनिक कमाई = ₹2,000 कमाई)।',
              color: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300',
            },
            {
              code: '3',
              name: '3 शिफ्ट (3)',
              desc: 'लगातार 3 शिफ्ट काम किया। 300% कमाई मिलेगी (उदा: ₹800 दैनिक कमाई = ₹2,400 कमाई)।',
              color: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300',
            },
            {
              code: 'A',
              name: 'अनुपस्थित / गैरहाजिर (0)',
              desc: 'कारीगर काम पर नहीं आया। उस दिन की कमाई ₹0 रहेगी।',
              color: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300',
            },
            {
              code: 'On Leave',
              name: 'स्वीकृत छुट्टी (Leave)',
              desc: 'कारीगर छुट्टी पर है। यह कारीगर आज की अटेंडेंस पेंडिंग लिस्ट में नहीं दिखेगा।',
              color: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300',
            },
          ],
          editNote: '💡 गलती से गलत बटन दब गया? चिंता न करें! उसी दिन सीधे सही बटन दबाएं, सिस्टम तुरंत पुरानी हाजिरी को अपडेट कर देगा।',
        },
        workers: {
          title: 'कारीगर प्रोफाइल और बैलेंस समझना',
          badge: 'वर्कफोर्स हब',
          desc: 'कारीगर का दिहाड़ी रेट, बाकी पेशगी और कुल बकाया राशि कैसे देखें।',
          highlights: [
            {
              title: 'Daily Earning (रोजाना कमाई दर)',
              desc: 'इस कारीगर का आपके साथ तय किया हुआ दैनिक रेट (उदा: ₹800/दिन)।',
            },
            {
              title: 'Advance Balance (बाकी पेशगी)',
              desc: 'कारीगर ने आपसे पहले जो पेशगी (Advance) ली है और अभी तक काटी नहीं गई है।',
            },
            {
              title: 'Net Payable (कुल देने योग्य पगार)',
              desc: 'कारीगर की कुल कमाई में से बाकी पेशगी घटाने के बाद शुद्ध रकम जो आपको देनी है।',
            },
            {
              title: 'Attendance Logs (हाजिरी रिकॉर्ड)',
              desc: 'इस कारीगर की दर्ज की गई कुल हाजिरियां और तारीख-वार कमाई का पूरा इतिहास।',
            },
          ],
        },
        finance: {
          title: 'पेशगी देना और नेट पगार चुकाना',
          badge: 'रुपया व हिसाब',
          desc: 'पेशगी (Advance) दर्ज करना और हफ्ते/महीने के अंत में बिना किसी गलती के हिसाब चुकता करना।',
          giveAdvance: {
            title: '1. पेशगी देना (Give Advance)',
            steps: [
              'कारीगर लिस्ट (/workers) में जाकर कारीगर के नाम पर टैप करें।',
              'ऊपर दिए गए "Give Advance" बटन को दबाएं।',
              'रकम (उदा: ₹2,000) भरें और कैश या UPI चुनें।',
              'सबमिट करें। कारीगर के खाते में पेशगी बैलेंस तुरंत अपडेट हो जाएगा।',
            ],
          },
          payNet: {
            title: '2. नेट पगार चुकाना (Pay Net)',
            steps: [
              'कारीगर कार्ड में "Pay Net" बटन दबाएं।',
              'सिस्टम अपने आप अब तक की सभी अनपेड हाजिरी की कमाई जोड़ लेगा।',
              'आप जितनी पेशगी काटना चाहते हैं (Advance Deduction) वह भरें, खाना/कमरा किराया या बोनस जोड़ें।',
              'स्क्रीन पर अंतिम नेट कैश (Net Paid) देखें और भुगतान कन्फर्म करें।',
              'सिस्टम तुरंत उन सभी दिनों की हाजिरी को "Paid & Locked" कर देगा और रसीद PDF जनरेट कर देगा।',
            ],
          },
        },
        pdf: {
          title: 'मस्टर रोल PDF और पेमेंट बिल निकालना',
          badge: 'प्रिंट योग्य रिपोर्ट',
          desc: 'साइट रिकॉर्ड और कारीगरों को देने के लिए आधिकारिक मासिक मस्टर रोल डाउनलोड करें।',
          features: [
            {
              title: 'Monthly Attendance PDF',
              desc: 'कारीगर कार्ड में "Monthly Attendance PDF" बटन दबाएं। यह पूरे महीने का तारीख-वार हाजिरी चार्ट, शिफ्ट कोड, कुल दिहाड़ी और दस्तखत (Signature) बॉक्स के साथ सुंदर PDF निकालता है।',
            },
            {
              title: 'पेमेंट बिल रसीद',
              desc: 'कारीगर कार्ड के "Payment Bills" टैब में हर भुगतान का बिल डाउनलोड करें जिसमें कमाई, काटी गई पेशगी और दिया गया नेट कैश साफ लिखा होता है।',
            },
          ],
        },
        search: {
          title: 'लेन-देन सर्च व बिल सत्यापन',
          badge: 'पेमेंट चेक',
          desc: 'किसी भी पुरानी रसीद या ट्रांजैक्शन आईडी को सेकंडों में कैसे ढूंढें।',
          steps: [
            'मेन्यू में "Transaction Search" खोलें।',
            'ट्रांजैक्शन आईडी (उदा: TXN-NET-xxx) दर्ज करें।',
            'पूरा विवरण देखें: किसने कब भुगतान किया, कितना पेशगी काटा और कभी भी दोबारा बिल PDF डाउनलोड करें।',
          ],
        },
        rules: {
          title: 'ठेकेदारों के लिए 4 सुनहरे नियम',
          badge: 'जरूरी सावधानियां',
          desc: 'हिसाब में कभी गड़बड़ी न हो, इसके लिए इन बातों का हमेशा ध्यान रखें।',
          list: [
            'हाजिरी रोजाना समय पर लगाएं: शाम को साइट छोड़ने से पहले हाजिरी दर्ज करें ताकि कोई दिन न छूटे।',
            'हर पेशगी ऐप में तुरंत दर्ज करें: हाथ से नकद देते ही ऐप में "Give Advance" करें ताकि हिसाब हमेशा पक्का रहे।',
            'पगार देने से पहले Net Payable देखें: ऐप अपने आप पेशगी काटकर नेट रकम बताता है, कभी ज्यादा पेमेंट न करें।',
            'महीने के अंत में Monthly Attendance PDF निकालें: रिकॉर्ड के लिए मस्टर रोल डाउनलोड करके फाइल में रखें।',
          ],
        },
      },
    },
    hinglish: {
      badge: 'Thekedar Master Guide',
      title: 'Thekedar User Guide (मार्गदर्शिका)',
      subtitle: 'Rozana attendance lagana, advance (pesgi) dena, net hisab chukana aur monthly PDF download karne ka aasan guide photos ke saath.',
      tabs: {
        attendance: 'Attendance & Codes',
        workers: 'Worker Profile',
        finance: 'Advance & Settlement',
        pdf: 'Monthly PDF',
        search: 'Transaction Search',
        rules: 'Golden Rules',
      },
      searchPlaceholder: 'Guide me search karein (e.g. attendance, advance, pesgi, 1.5x, pdf)...',
      sections: {
        attendance: {
          title: 'Daily Attendance & Shift Codes Lagana',
          badge: 'Roz ka Kaam',
          desc: 'Dashboard ya Worker Card se karigaron ki attendance kaise lagayein.',
          steps: [
            {
              step: '1',
              title: 'Dashboard par "Today\'s Attendance" dekhein',
              text: 'Thekedar Dashboard open karein, wahan sabhi active karigaron ke naam aur 1-tap buttons milenge.',
            },
            {
              step: '2',
              title: 'Shift ke hisab se sahi button dabayein',
              text: 'Har code daily earning (dehadi) ke hisab se automatic calculation karta hai:',
            },
          ],
          codes: [
            {
              code: '0.5',
              name: 'Aadha Din (0.5 Dehadi)',
              desc: 'Half day kaam kiya (e.g. ₹800 dehadi = ₹400 kamai).',
              color: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300',
            },
            {
              code: '1',
              name: 'Pura Din (1 Dehadi)',
              desc: 'Full day kaam kiya (e.g. ₹800 dehadi = ₹800 kamai).',
              color: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300',
            },
            {
              code: '1.5',
              name: 'Dehadi + Overtime (1.5)',
              desc: 'Shaam 9 PM tak overtime kiya (e.g. ₹800 dehadi = ₹1,200 kamai).',
              color: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300',
            },
            {
              code: '2',
              name: 'Double Dehadi / Night (2)',
              desc: 'Raat 12 baje tak ya double duty kiya (e.g. ₹800 dehadi = ₹1,600 kamai).',
              color: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300',
            },
            {
              code: '2.5',
              name: '2.5 Shift (2.5 Dehadi)',
              desc: 'Extended 2.5 shift kaam kiya (e.g. ₹800 dehadi = ₹2,000 kamai).',
              color: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300',
            },
            {
              code: '3',
              name: '3 Shift (3 Dehadi)',
              desc: 'Continuous 3 shift kaam kiya (e.g. ₹800 dehadi = ₹2,400 kamai).',
              color: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300',
            },
            {
              code: 'A',
              name: 'Absent / Chhutti (0)',
              desc: 'Karigar kaam par nahi aaya. Us din ka ₹0 hisab banega.',
              color: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300',
            },
            {
              code: 'On Leave',
              name: 'Approved Leave',
              desc: 'Karigar leave par hai. Dashboard ke pending list se automatic hide ho jayega.',
              color: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300',
            },
          ],
          editNote: '💡 Galti se doosra button dab gaya? Bas usi din dobara sahi button daba dein, entry turant update ho jayegi!',
        },
        workers: {
          title: 'Worker Profile & Balance Samajhna',
          badge: 'Workforce Details',
          desc: 'Karigar ka daily earning, advance balance aur net payable dekhna.',
          highlights: [
            {
              title: 'Daily Earning (Dehadi Dar)',
              desc: 'Aapke dwara tay kiya gaya daily rate (e.g. ₹800/day).',
            },
            {
              title: 'Advance Balance (Baaki Pesgi)',
              desc: 'Karigar dwara pehle liya gaya advance jo abhi tak nahi kata hai.',
            },
            {
              title: 'Net Payable (Dene Yogya Rakam)',
              desc: 'Total kamai me se advance katne ke baad jo net cash karigar ko dena banta hai.',
            },
            {
              title: 'Attendance Logs',
              desc: 'Total recorded shifts aur date-wise kamai ka pura record.',
            },
          ],
        },
        finance: {
          title: 'Advance Dena aur Net Pagar Chukana',
          badge: 'Cash & Settlement',
          desc: 'Pesgi record karna aur bina kisi confusion ke hisab clear karna.',
          giveAdvance: {
            title: '1. Advance Dena (Give Advance)',
            steps: [
              'Workers page (/workers) me karigar ke naam par tap karein.',
              '"Give Advance" button par click karein.',
              'Amount daalein (e.g. ₹2,000) aur Cash/UPI select karein.',
              'Confirm karein. Advance balance turant update ho jayega.',
            ],
          },
          payNet: {
            title: '2. Net Pagar Chukana (Pay Net)',
            steps: [
              'Worker card me "Pay Net" par click karein.',
              'System sabhi unpaid shifts ki kamai auto-calculate karega.',
              'Advance cut karein, room/food deduction daalein aur Net Cash confirm karein.',
              'Payment hote hi sabhi shifts "Paid & Locked" ho jayengi aur Payment Bill generate ho jayega.',
            ],
          },
        },
        pdf: {
          title: 'Monthly Attendance PDF aur Bills Download Karna',
          badge: 'Printable Records',
          desc: 'Site verification aur record ke liye official monthly muster roll download karein.',
          features: [
            {
              title: 'Monthly Attendance PDF',
              desc: 'Worker modal me "Monthly Attendance PDF" par tap karein. Pura month-wise attendance chart dates, codes, total dehadi aur signature box ke saath download hoga.',
            },
            {
              title: 'Payment Bills',
              desc: '"Payment Bills" tab me jakar kisi bhi transaction ka official bill download karein.',
            },
          ],
        },
        search: {
          title: 'Transaction Search & Receipt Verification',
          badge: 'Lookup',
          desc: 'Kisi bhi payment receipt ko ID se turant verify karein.',
          steps: [
            'Menu se "Transaction Search" open karein.',
            'Transaction ID (e.g. TXN-NET-xxx) enter karein.',
            'Pura hisab dekhein aur anytime PDF bill dobara download karein.',
          ],
        },
        rules: {
          title: 'Thekedaron ke liye 4 Zaroori Niyam',
          badge: 'Golden Rules',
          desc: 'Site par hisab-kitab me kabhi ladai ya confusion na ho iske liye:',
          list: [
            'Daily attendance time par lagayein: Shaam ko kaam khatam hote hi shift mark karein.',
            'Har pesgi turant app me daalein: Hath me cash dete hi "Give Advance" karein.',
            'Payment karne se pehle Net Payable check karein: System auto-minus karke safe amount dikhata hai.',
            'Month-end par Monthly PDF download karein: Apne pas site muster roll ka record zaroor rakhein.',
          ],
        },
      },
    },
  };

  const current = content[guideLang] || content.en;
  const sections = current.sections;

  // Filter sections if search query is entered
  const isMatch = (text) => {
    if (!searchQuery.trim()) return true;
    return text?.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={current.title} maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Top Banner & Language Switcher */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {current.badge}
              </span>

              {/* Language Switch Pills inside Guide */}
              <div className="flex items-center rounded-xl bg-black/20 p-1 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setGuideLang('en')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    guideLang === 'en' ? 'bg-white text-amber-900 shadow' : 'text-white/80 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setGuideLang('hi')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    guideLang === 'hi' ? 'bg-white text-amber-900 shadow' : 'text-white/80 hover:text-white'
                  }`}
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  onClick={() => setGuideLang('hinglish')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    guideLang === 'hinglish' ? 'bg-white text-amber-900 shadow' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Hinglish
                </button>
              </div>
            </div>

            <h2 className="mt-3 text-lg sm:text-2xl font-black tracking-tight">{current.title}</h2>
            <p className="mt-1 text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">{current.subtitle}</p>
          </div>
          <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={current.searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
          {Object.entries(current.tabs).map(([key, label]) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setSearchQuery('');
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {key === 'attendance' && <CalendarCheck className="h-4 w-4" />}
                {key === 'workers' && <Users className="h-4 w-4" />}
                {key === 'finance' && <IndianRupee className="h-4 w-4" />}
                {key === 'pdf' && <FileDown className="h-4 w-4" />}
                {key === 'search' && <Search className="h-4 w-4" />}
                {key === 'rules' && <ShieldCheck className="h-4 w-4" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Attendance & Codes */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold px-2 py-0.5">
                  {sections.attendance.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {sections.attendance.title}
                </h3>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {sections.attendance.desc}
              </p>
            </div>

            {/* REAL APP PHOTO: Today's Attendance Screen */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  {guideLang === 'en' ? 'Actual Screen: Today\'s Attendance' : 'ऐप स्क्रीन: आज की हाजिरी लिस्ट'}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Live View
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-inner">
                <img
                  src="/guide/attendance-marking.jpg"
                  alt="Today's Attendance screen with P, Half, 1.5x, 2x, Absent buttons"
                  className="w-full max-h-72 object-contain bg-slate-100 dark:bg-slate-950"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 italic">
                {guideLang === 'en'
                  ? 'Tap any code button (P, Half, 1.5x, 2x, Absent) next to worker name. The badge turns orange when selected.'
                  : 'कारीगर के नाम के सामने बटन (P, Half, 1.5x, 2x, Absent) दबाएं। सेलेक्ट होने पर बटन केसरी/नारंगी हो जाता है।'}
              </p>
            </div>

            {/* Step by step */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sections.attendance.steps.map((s, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">
                      {s.step}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{s.title}</h4>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-8">{s.text}</p>
                </div>
              ))}
            </div>

            {/* Shift Codes Breakdown Cards */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {guideLang === 'en' ? 'Shift Codes & Earning Calculation' : 'शिफ्ट कोड्स और कमाई की गणना'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {sections.attendance.codes.map((c) => (
                  <div key={c.code} className={`rounded-xl border p-3 ${c.color} transition hover:shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">{c.code}</span>
                      <span className="text-[11px] font-bold opacity-80">{c.name}</span>
                    </div>
                    <p className="mt-1.5 text-xs opacity-90 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Diagram */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {guideLang === 'en' ? 'Direct Thekedar Approval Flow' : 'ठेकेदार डायरेक्ट हाजिरी अप्रूवल सिस्टम'}
              </h4>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <img
                  src="/guide/attendance-flow.png"
                  alt="Attendance Flow Diagram"
                  className="w-full max-h-48 object-contain bg-slate-950 p-2"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{sections.attendance.editNote}</p>
            </div>
          </div>
        )}

        {/* TAB 2: Worker Profiles */}
        {activeTab === 'workers' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[11px] font-bold px-2 py-0.5">
                  {sections.workers.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {sections.workers.title}
                </h3>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {sections.workers.desc}
              </p>
            </div>

            {/* REAL APP PHOTO: Worker Card Details */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  {guideLang === 'en' ? 'Actual Screen: Worker Profile & Action Card' : 'ऐप स्क्रीन: कारीगर प्रोफाइल व हिसाब कार्ड'}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {guideLang === 'en' ? 'Craftsman Profile Card' : 'कारीगर प्रोफाइल कार्ड'}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-inner">
                <img
                  src="/guide/worker-card.png"
                  alt="Worker Profile Card with Daily Earning, Advance, Net Payable, and Actions"
                  className="w-full max-h-80 object-contain bg-slate-100 dark:bg-slate-950"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 italic">
                {guideLang === 'en'
                  ? 'Tap any craftsman in Workforce (/workers) to open this card. You can see Daily Earning, Advance Balance, Net Payable, Pay Net, and Give Advance.'
                  : 'कारीगर लिस्ट में किसी भी कारीगर के नाम पर टैप करें। यह कार्ड खुलेगा जहां दैनिक कमाई दर, पेशगी बैलेंस, नेट देय रकम, पगार चुकाना व पेशगी देने के बटन हैं।'}
              </p>
            </div>

            {/* Highlights Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sections.workers.highlights.map((h, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-800/50">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500" />
                    {h.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Finances, Advances & Net Wage Payouts */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold px-2 py-0.5">
                  {sections.finance.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {sections.finance.title}
                </h3>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {sections.finance.desc}
              </p>
            </div>

            {/* Visual Guide to Give Advance vs Pay Net */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Give Advance */}
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-sm">
                    ₹
                  </div>
                  <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                    {sections.finance.giveAdvance.title}
                  </h4>
                </div>
                <ul className="mt-3 space-y-2 text-xs text-rose-900/90 dark:text-rose-300/90">
                  {sections.finance.giveAdvance.steps.map((st, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-bold text-rose-600 shrink-0">{i + 1}.</span>
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pay Net */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                  <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    {sections.finance.payNet.title}
                  </h4>
                </div>
                <ul className="mt-3 space-y-2 text-xs text-emerald-900/90 dark:text-emerald-300/90">
                  {sections.finance.payNet.steps.map((st, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-bold text-emerald-600 shrink-0">{i + 1}.</span>
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Formula Banner */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-center">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block mb-1">
                {guideLang === 'en' ? 'Net Cash Payout Formula' : 'नेट कैश भुगतान का सटीक फॉर्मूला'}
              </span>
              <p className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-100 font-mono">
                Net Paid = (Earned Amount + Bonus) − (Advance Cut + Food/Room)
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: Monthly Attendance PDF & Bills */}
        {activeTab === 'pdf' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[11px] font-bold px-2 py-0.5">
                  {sections.pdf.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {sections.pdf.title}
                </h3>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {sections.pdf.desc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sections.pdf.features.map((f, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                      <FileDown className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{f.title}</h4>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                {guideLang === 'en'
                  ? 'All PDF downloads are encrypted and directly saved to your phone or desktop Downloads folder.'
                  : 'सभी PDF सीधे आपके फोन या कंप्यूटर के Downloads फोल्डर में सुरक्षित रूप से सेव हो जाते हैं।'}
              </span>
            </div>
          </div>
        )}

        {/* TAB 5: Transaction Search */}
        {activeTab === 'search' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 text-[11px] font-bold px-2 py-0.5">
                  {sections.search.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {sections.search.title}
                </h3>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {sections.search.desc}
              </p>
            </div>

            {/* REAL APP PHOTO: Transaction Search */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-cyan-600" />
                  {guideLang === 'en' ? 'Actual Screen: Transaction Search Tab' : 'ऐप स्क्रीन: ट्रांजैक्शन सर्च टैब'}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <img
                  src="/guide/transaction-search.png"
                  alt="Transaction Search Header"
                  className="h-10 object-contain mx-auto"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="space-y-2">
              {sections.search.steps.map((st, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-800/50">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-white text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-0.5">{st}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: Golden Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold px-2 py-0.5">
                  {sections.rules.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {sections.rules.title}
                </h3>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {sections.rules.desc}
              </p>
            </div>

            <div className="space-y-2.5">
              {sections.rules.list.map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 p-3.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100 leading-relaxed">
                    {r}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Close Button */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 dark:bg-slate-100 px-5 py-2.5 text-xs sm:text-sm font-bold text-white dark:text-slate-900 transition hover:opacity-90 cursor-pointer"
          >
            {guideLang === 'en' ? 'Close Guide' : 'गाइड बंद करें'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
