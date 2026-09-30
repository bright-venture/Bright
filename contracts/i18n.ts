// Bilingual UI strings (English / Arabic).
import type { Lang, RequestStatus, UrgencyLevel } from "./services";

export const t = {
  brand: { en: "Be Right", ar: "بي رايت" },
  brandByline: { en: "by Bright", ar: "من برايت" },
  tagline: {
    en: "Fixed right, the first time.",
    ar: "تصليح صح، من أول مرة.",
  },
  nav: {
    services: { en: "Services", ar: "خدماتنا" },
    how: { en: "How it works", ar: "كيف منشتغل" },
    why: { en: "Why Be Right", ar: "ليش بي رايت" },
    trust: { en: "Our promise", ar: "وعدنا" },
    join: { en: "For technicians", ar: "للفنيين" },
    book: { en: "Book a service", ar: "احجز خدمة" },
    myRequests: { en: "My requests", ar: "طلباتي" },
    dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
    jobs: { en: "Jobs", ar: "مهامي" },
    login: { en: "Sign in", ar: "تسجيل الدخول" },
    logout: { en: "Sign out", ar: "تسجيل الخروج" },
  },
  hero: {
    kicker: { en: "Home maintenance · Lebanon", ar: "صيانة منزلية · لبنان" },
    h1a: { en: "Fast. Fair. Safe.", ar: "سرعة. سعر عادل. أمان." },
    h1b: { en: "Guaranteed.", ar: "وضمانة." },
    sub: {
      en: "Home maintenance in Lebanon without the phone roulette. Book in about a minute, approve the price before dispatch, and if it's not right — we come back and make it right. It's in the name.",
      ar: "صيانة منزلية بلبنان بلا لعبة التليفونات. احجز بحوالي دقيقة، وافق على السعر قبل الإرسال، وإذا مش مظبوطة — منرجع منظبطها. هيك اسمنا.",
    },
    cta: { en: "Book a service", ar: "احجز خدمة" },
    ctaSecondary: { en: "How it works", ar: "كيف منشتغل" },
    chip1: { en: "Free to book", ar: "الحجز مجاني" },
    chip2: { en: "About 60 seconds", ar: "حوالي ٦٠ ثانية" },
    chip3: { en: "You approve the price first", ar: "السعر بموافقتك أولاً" },
    stat1: { en: "guided questions, no technical words needed", ar: "أسئلة موجّهة، بلا مصطلحات تقنية" },
    stat2: { en: "specialist review before every dispatch", ar: "مراجعة مختص قبل كل إرسال" },
    stat3: { en: "price approved by you before we roll", ar: "السعر بموافقتك قبل ما نتحرك" },
  },
  marquee: {
    text: {
      en: "Be right · Be bright · Fast · Fair price · Safe · Guaranteed · Fixed right the first time · ",
      ar: "بي رايت · سرعة · سعر عادل · أمان · ضمانة · صح من أول مرة · ",
    },
  },
  services: {
    kicker: { en: "(Services)", ar: "(خدماتنا)" },
    title: { en: "One call. Every trade.", ar: "اتصال واحد. كل المهن." },
    sub: {
      en: "Ten services for homes, buildings, restaurants and businesses — each launched only when qualified workers, tools and service hours are ready.",
      ar: "عشر خدمات للبيوت والمباني والمطاعم والشركات — كل خدمة منطلّقها بس لما يكون في فريق مؤهل وعدّة جاهزة.",
    },
    bookThis: { en: "Book", ar: "احجز" },
  },
  how: {
    kicker: { en: "(How it works)", ar: "(كيف منشتغل)" },
    title: { en: "Specialist-led, from hello to done.", ar: "بإشراف مختص، من أول اتصال لآخر تصليحة." },
    steps: [
      {
        title: { en: "Open & describe", ar: "افتح واشرح" },
        body: {
          en: "Open the app or scan our QR code on site. Pick a service, answer simple questions, add safe photos or video.",
          ar: "افتح التطبيق أو امسح رمز QR بالموقع. اختار الخدمة، جاوب على أسئلة بسيطة، وضيف صور أو فيديو بأمان.",
        },
      },
      {
        title: { en: "Specialist review", ar: "مراجعة المختص" },
        body: {
          en: "A remote engineer checks the issue and urgency, and lists the skills, tools, safety gear and likely parts.",
          ar: "مهندس عن بُعد بيراجع المشكلة واستعجالها، وبيحدد المهارات والعدّة ومعدات السلامة والقطع المتوقعة.",
        },
      },
      {
        title: { en: "You approve", ar: "موافقتك" },
        body: {
          en: "We show the visit fee or quote, the appointment and any priority charge. Nothing moves before you approve.",
          ar: "منعرضلك كلفة الزيارة أو العرض والموعد وأي رسوم استعجال. ما منتحرك قبل موافقتك.",
        },
      },
      {
        title: { en: "We prepare & dispatch", ar: "منحضّر ومنبعت" },
        body: {
          en: "A qualified worker is assigned — you see who's coming. If parts are needed, we route them to an approved supplier first.",
          ar: "منعيّن فني مؤهل وبتلاقي مين جاي. إذا في قطع، منوجّهه لمورّد معتمد أول شي.",
        },
      },
      {
        title: { en: "Work with support", ar: "شغل بمتابعة" },
        body: {
          en: "The worker records arrival and progress. The specialist supports any changes — you approve extra cost before extra work.",
          ar: "الفني بيسجّل وصوله وتقدم الشغل. المختص بيتابع أي تعديل — وأي كلفة إضافية بموافقتك أولاً.",
        },
      },
      {
        title: { en: "Finish & follow-up", ar: "خلاص ومساعدة بعدية" },
        body: {
          en: "Completion evidence is uploaded, we check the result, and your case stays open for feedback or a revisit.",
          ar: "بيترفع إثبات الإنجاز، منراجع النتيجة، وطلبك بيضل مفتوح لأي ملاحظة أو زيارة تانية.",
        },
      },
    ] as { title: { en: string; ar: string }; body: { en: string; ar: string } }[],
  },
  why: {
    kicker: { en: "(Why Be Right)", ar: "(ليش بي رايت)" },
    title: { en: "Not a directory. A managed repair.", ar: "مش دليل أرقام. تصليحة مدارة." },
    sub: {
      en: "Other apps give you a phone number. We give you a case owner. The specialist prepares the job before travel so the technician arrives with the right context, tools and likely parts.",
      ar: "التطبيقات التانية بتعطيك رقم تليفون. نحنا منعطيك مسؤول ملف. المختص بيحضّر الشغل قبل ما يتحرك الفني، فيوصل معو المعلومات والعدّة والقطع الصح.",
    },
    urgencyTitle: { en: "Urgency you can see", ar: "استعجال واضح" },
    urgencySub: {
      en: "Your answers — not a button — suggest the urgency. A specialist confirms it, and any surcharge is shown clearly before you approve.",
      ar: "أجوبتك — مش زر — هي يلي بتحدد الاستعجال. المختص بيأكدو، وأي رسوم إضافية بتظهر بوضوح قبل موافقتك.",
    },
  },
  trust: {
    kicker: { en: "(Our promise)", ar: "(وعدنا)" },
    title: { en: "Four promises. Every job.", ar: "أربع وعود. بكل شغلة." },
    sub: {
      en: "Speed, fair pricing, safety and a guarantee — this is what Be Right means.",
      ar: "سرعة، سعر عادل، أمان وضمانة — هيدا معنى بي رايت.",
    },
    items: [
      {
        title: { en: "Fast", ar: "سرعة" },
        body: {
          en: "Book in about a minute — no calls, no waiting for a callback. Urgent cases jump the queue and a specialist reviews them first.",
          ar: "احجز بحوالي دقيقة — بلا اتصالات، بلا انتظار حدا يرد. الحالات الطارئة بتتقدّم الطابور والمختص بيراجعها أول شي.",
        },
      },
      {
        title: { en: "Fair price", ar: "سعر عادل" },
        body: {
          en: "You see and approve the price before anyone drives to you. No haggling at the door, no surprise add-ons after the job.",
          ar: "بتشوف السعر وبتوافق عليه قبل ما حدا يتحرك لعندك. بلا فصال عالباب، وبلا زيادات مفاجئة بعد الشغل.",
        },
      },
      {
        title: { en: "Safe", ar: "أمان" },
        body: {
          en: "Verified technicians only — and guided photos mean you never open a live panel or touch a gas line just to explain the problem.",
          ar: "فنيين موثّقين بس — والتصوير الموجّه يعني إنك أبداً ما بتفتح لوحة كهربا أو بتقرب من خط غاز لتشرح المشكلة.",
        },
      },
      {
        title: { en: "Guaranteed", ar: "ضمانة" },
        body: {
          en: "Every job is logged, photographed and reviewed. If it's not right, we come back and make it right — it's in the name.",
          ar: "كل شغلة مسجّلة وموثّقة ومراجعة. إذا مش مظبوطة، منرجع منظبطها — هيك اسمنا.",
        },
      },
    ] as { title: { en: string; ar: string }; body: { en: string; ar: string } }[],
  },
  cta: {
    title: { en: "Something broken?", ar: "في شي مكسور؟" },
    sub: {
      en: "Book in two minutes. A specialist takes it from there.",
      ar: "احجز بدقيقتين. والمختص بيتابع من هون.",
    },
    button: { en: "Book a service", ar: "احجز خدمة" },
  },
  footer: {
    tagline: { en: "Be right. Be bright.", ar: "بي رايت. صح من أول مرة." },
    contactSoon: {
      en: "Contact details coming soon — reach us through the app.",
      ar: "معلومات التواصل قريباً — كلمنا من التطبيق.",
    },
    rights: { en: "Be Right by Bright · brightlb.com", ar: "بي رايت من برايت · brightlb.com" },
  },
  book: {
    title: { en: "Book a service", ar: "احجز خدمة" },
    stepCategory: { en: "Service", ar: "الخدمة" },
    stepQuestions: { en: "Questions", ar: "أسئلة" },
    stepPhotos: { en: "Photos", ar: "صور" },
    stepWhen: { en: "Time & place", ar: "الوقت والمكان" },
    stepReview: { en: "Review", ar: "مراجعة" },
    pickCategory: { en: "What do you need help with?", ar: "بشو بدك مساعدة؟" },
    next: { en: "Next", ar: "التالي" },
    back: { en: "Back", ar: "رجوع" },
    photosTitle: {
      en: "Add photos or a short video",
      ar: "ضيف صور أو فيديو قصير",
    },
    photosHint: {
      en: "A wide shot + a close-up + the equipment label help the specialist prepare. Never open panels or climb for a photo.",
      ar: "صورة واسعة + صورة قريبة + صورة لستيكر الجهاز بيساعدوا المختص. أبداً لا تفتح لوحات أو تطلع عالي لصورة.",
    },
    photosOptional: { en: "Optional, but it speeds everything up.", ar: "اختياري، بس بيسرّع كل شي." },
    addPhotos: { en: "Add photos / video", ar: "ضيف صور / فيديو" },
    date: { en: "Preferred date", ar: "التاريخ المفضل" },
    slot: { en: "Preferred time", ar: "الوقت المفضل" },
    slotMorning: { en: "Morning (8–12)", ar: "صباحاً (٨–١٢)" },
    slotAfternoon: { en: "Afternoon (12–5)", ar: "بعد الضهر (١٢–٥)" },
    slotEvening: { en: "Evening (5–9)", ar: "مساءً (٥–٩)" },
    area: { en: "Area / city", ar: "المنطقة / المدينة" },
    areaPh: { en: "e.g. Achrafieh, Beirut", ar: "مثال: الأشرفية، بيروت" },
    address: { en: "Address details", ar: "تفاصيل العنوان" },
    addressPh: { en: "Building, floor, landmarks…", ar: "المبنى، الطابق، علامات مميزة…" },
    phone: { en: "Phone / WhatsApp", ar: "هاتف / واتساب" },
    phonePh: { en: "+961 …", ar: "+961 …" },
    notes: { en: "Anything else? (optional)", ar: "شي زيادة؟ (اختياري)" },
    notesPh: { en: "Parking, gate code, pets…", ar: "موقف، رمز البوابة، حيوانات أليفة…" },
    reviewTitle: { en: "Check your request", ar: "راجع طلبك" },
    submit: { en: "Submit request", ar: "أرسل الطلب" },
    submitting: { en: "Sending…", ar: "عم نرسل…" },
    suggestedUrgency: { en: "Suggested urgency from your answers", ar: "الاستعجال المقترح حسب أجوبتك" },
    urgencyDisclaimer: {
      en: "A specialist confirms urgency and any surcharge before dispatch — nothing is charged without your approval.",
      ar: "المختص بيأكد الاستعجال وأي رسوم إضافية قبل الإرسال — ما في أي دفع بلا موافقتك.",
    },
    successTitle: { en: "Request received!", ar: "وصلنا طلبك!" },
    successBody: {
      en: "A Be Right specialist is reviewing your case. You'll see every status change here.",
      ar: "مختص بي رايت عم يراجع ملفك. رح تشوف كل تحديث بالحالة هون.",
    },
    viewRequests: { en: "View my requests", ar: "شوف طلباتي" },
    bookAnother: { en: "Book another service", ar: "احجز خدمة تانية" },
    confirmTitle: { en: "Last step: confirm your email", ar: "آخر خطوة: أكّد الإيميل تبعك" },
    confirmBody: {
      en: "We'll send you a code so you can follow your request, see the quote and approve it. Your answers and photos are saved on this device.",
      ar: "منبعتلك رمز لتتابع طلبك، تشوف العرض وتوافق عليه. أجوبتك وصورك محفوظين على هالجهاز.",
    },
    confirmSend: { en: "Send me the code", ar: "ابعتلي الرمز" },
    sendingAs: { en: "Sending as", ar: "عم تبعت باسم" },
    uploadingPhotos: { en: "Uploading photos", ar: "عم نرفع الصور" },
    uploadFailed: {
      en: "That file can't be added. Photos and videos up to 20 MB only.",
      ar: "ما فينا نضيف هالملف. صور وفيديو لحد ٢٠ ميغا بس.",
    },
    required: { en: "Required", ar: "مطلوب" },
  },
  requests: {
    title: { en: "My requests", ar: "طلباتي" },
    empty: { en: "No requests yet — book your first service.", ar: "ما في طلبات بعد — احجز أول خدمة." },
    created: { en: "Created", ar: "تاريخ الطلب" },
    preferred: { en: "Preferred", ar: "الموعد المفضل" },
    urgency: { en: "Urgency", ar: "الاستعجال" },
    quote: { en: "Quote", ar: "العرض" },
    approveQuote: { en: "Approve quote", ar: "وافق على العرض" },
    declineQuote: { en: "Decline", ar: "ارفض" },
    cancel: { en: "Cancel request", ar: "إلغاء الطلب" },
    timeline: { en: "Timeline", ar: "المراحل" },
    photos: { en: "Your photos", ar: "صورك" },
    answers: { en: "Your answers", ar: "أجوبتك" },
    status: { en: "Status", ar: "الحالة" },
  },
  dash: {
    title: { en: "Specialist dashboard", ar: "لوحة المختص" },
    queue: { en: "Queue", ar: "الطلبات" },
    empty: { en: "No requests in the queue.", ar: "ما في طلبات." },
    notAdmin: {
      en: "This area is for Be Right specialists. Ask an administrator to add your email to the specialist list.",
      ar: "هالمنطقة لمختصين بي رايت. اطلب من المسؤول يضيف إيميلك على لائحة المختصين.",
    },
    setUrgency: { en: "Confirmed urgency", ar: "الاستعجال المؤكد" },
    sendQuote: { en: "Send quote", ar: "أرسل العرض" },
    quoteAmount: { en: "Quote amount (USD)", ar: "قيمة العرض (دولار)" },
    quoteNote: { en: "Quote note", ar: "ملاحظة العرض" },
    advance: { en: "Advance status", ar: "حدّث الحالة" },
    note: { en: "Note (optional)", ar: "ملاحظة (اختياري)" },
    customer: { en: "Customer", ar: "العميل" },
    suggested: { en: "System suggestion", ar: "اقتراح النظام" },
    review: { en: "Start review", ar: "ابدأ المراجعة" },
    schedule: { en: "Schedule", ar: "حدد الموعد" },
    startWork: { en: "Start work", ar: "ابدأ الشغل" },
    complete: { en: "Mark completed", ar: "أنهي الطلب" },
    answers: { en: "Guided answers", ar: "الأجوبة الموجّهة" },
    media: { en: "Media", ar: "الصور" },
  },
  status: {
    submitted: { en: "Submitted", ar: "تم الإرسال" },
    in_review: { en: "In review", ar: "قيد المراجعة" },
    quote_ready: { en: "Quote ready", ar: "العرض جاهز" },
    approved: { en: "Approved", ar: "تمت الموافقة" },
    scheduled: { en: "Scheduled", ar: "تم تحديد الموعد" },
    in_progress: { en: "In progress", ar: "قيد التنفيذ" },
    completed: { en: "Completed", ar: "مكتمل" },
    cancelled: { en: "Cancelled", ar: "ملغي" },
  } as Record<RequestStatus, { en: string; ar: string }>,
  urgency: {
    normal: { en: "Normal", ar: "عادي" },
    priority: { en: "Priority", ar: "أولوية" },
    urgent: { en: "Urgent", ar: "مستعجل" },
    critical: { en: "Critical", ar: "حرج" },
  } as Record<UrgencyLevel, { en: string; ar: string }>,
  tech: {
    title: { en: "My jobs", ar: "مهامي" },
    empty: { en: "No jobs assigned to you yet.", ar: "ما في مهام معيّنة إلك بعد." },
    notTech: {
      en: "This area is for Be Right technicians. A specialist can grant access from the dashboard.",
      ar: "هالمنطقة لفنيين بي رايت. المختص بيعطي الصلاحية من لوحة التحكم.",
    },
    customer: { en: "Customer", ar: "العميل" },
    appointment: { en: "Appointment", ar: "الموعد" },
    shareStart: { en: "Start live location", ar: "ابدأ مشاركة الموقع" },
    shareStop: { en: "Stop sharing", ar: "أوقف المشاركة" },
    sharing: { en: "Live location on", ar: "الموقع المباشر شغّال" },
    shareHint: {
      en: "The customer sees your location while the job is active.",
      ar: "العميل بيشوف موقعك طالما الشغل شغّال.",
    },
    geoError: {
      en: "Location unavailable — allow location access and try again.",
      ar: "الموقع مش متاح — اسمح بالوصول للموقع وجرّب مرة تانية.",
    },
    arrived: { en: "Arrived", ar: "وصلت" },
    startWork: { en: "Start work", ar: "ابدأ الشغل" },
    complete: { en: "Complete job", ar: "أنهي الشغل" },
    notePh: { en: "Note for the specialist (optional)", ar: "ملاحظة للمختص (اختياري)" },
  },
  tracking: {
    techOnWay: { en: "Your technician", ar: "الفني تبعك" },
    liveLocation: { en: "Live location", ar: "الموقع المباشر" },
    lastUpdate: { en: "Last update", ar: "آخر تحديث" },
    noLocationYet: {
      en: "The technician hasn't shared their location yet.",
      ar: "الفني لسا ما شارك موقعه.",
    },
  },
  events: {
    assigned: { en: "Technician assigned", ar: "تم تعيين الفني" },
    arrived: { en: "Technician arrived", ar: "الفني وصل" },
    in_progress: { en: "Work started", ar: "الشغل بدأ" },
    completed: { en: "Job completed", ar: "الشغل خلص" },
  },
  join: {
    nav: { en: "For technicians", ar: "للفنيين" },
    kicker: { en: "(Work with us)", ar: "(اشتغل معنا)" },
    sectionTitle: { en: "Good at your trade? Work with Be Right.", ar: "شاطر بمهنتك؟ اشتغل مع بي رايت." },
    bullet1: {
      en: "Steady local work — jobs matched to your trade and your area.",
      ar: "شغل محلي ثابت — مهام حسب مهنتك ومنطقتك.",
    },
    bullet2: {
      en: "Arrive prepared — specialist instructions, photos and parts routing before you drive.",
      ar: "وصل محضّر — تعليمات المختص والصور وتوجيه القطع قبل ما تتحرك.",
    },
    bullet3: {
      en: "No haggling — the price is approved before you're dispatched.",
      ar: "بلا فصال — السعر متفق عليه قبل ما تنبعت.",
    },
    cta: { en: "Apply to join", ar: "قدّم طلبك" },
    title: { en: "Apply as a technician", ar: "قدّم طلبك كفني" },
    sub: {
      en: "Tell us about your trade. Our team reviews every application and contacts you for onboarding.",
      ar: "خبّرنا عن مهنتك. فريقنا بيراجع كل طلب وبيتصل فيك للانضمام.",
    },
    name: { en: "Full name", ar: "الاسم الكامل" },
    namePh: { en: "e.g. Hassan Khalil", ar: "مثال: حسن خليل" },
    phone: { en: "Phone / WhatsApp", ar: "هاتف / واتساب" },
    trade: { en: "Your trade", ar: "مهنتك" },
    area: { en: "Areas you cover", ar: "المناطق يلي بتغطيها" },
    areaPh: { en: "e.g. Beirut, Mount Lebanon", ar: "مثال: بيروت، جبل لبنان" },
    notes: { en: "Experience & notes (optional)", ar: "خبرتك وملاحظات (اختياري)" },
    notesPh: { en: "Years of experience, certifications, tools you own…", ar: "سنوات الخبرة، شهادات، عدّة عندك…" },
    submit: { en: "Send application", ar: "أرسل الطلب" },
    sending: { en: "Sending…", ar: "عم نرسل…" },
    successTitle: { en: "Application received!", ar: "وصلنا طلبك!" },
    successBody: {
      en: "Our team will review it and contact you on the number you gave us. Welcome aboard soon.",
      ar: "فريقنا رح يراجعو ويتواصل معك على الرقم يلي عطيتنا ياه. أهلاً فيك قريباً.",
    },
    backHome: { en: "Back to home", ar: "رجوع للصفحة الرئيسية" },
  },
  dash3: {
    tabQueue: { en: "Requests queue", ar: "طابور الطلبات" },
    tabApplications: { en: "Technician applications", ar: "طلبات الفنيين" },
    noApplications: { en: "No applications yet.", ar: "ما في طلبات بعد." },
    new: { en: "New", ar: "جديد" },
    contacted: { en: "Contacted", ar: "تم التواصل" },
    hired: { en: "Hired", ar: "تم التوظيف" },
    rejected: { en: "Rejected", ar: "مرفوض" },
  },
  dash2: {
    assignTech: { en: "Assign technician", ar: "عيّن فني" },
    chooseTech: { en: "Select…", ar: "اختار…" },
    techEmail: { en: "Technician email", ar: "إيميل الفني" },
    addTech: { en: "Add technician", ar: "أضف فني" },
    addTechHint: {
      en: "They must sign in once before you can add them.",
      ar: "لازم يسجّل دخوله مرة قبل ما تضيفه.",
    },
    currentTech: { en: "Assigned technician", ar: "الفني المعيّن" },
    none: { en: "Not assigned", ar: "غير معيّن" },
  },
  login: {
    title: { en: "Welcome", ar: "أهلاً فيك" },
    sub: {
      en: "Sign in with your email to book services, track your requests and approve quotes.",
      ar: "سجّل دخولك بالإيميل لتحجز خدمة، تتابع طلباتك، وتوافق على العروض.",
    },
    email: { en: "Email", ar: "الإيميل" },
    name: { en: "Your name (optional)", ar: "اسمك (اختياري)" },
    namePh: { en: "So our specialist knows who to ask for", ar: "ليعرف المختص مين يسأل عنه" },
    sendLink: { en: "Email me a sign-in link", ar: "ابعتلي رابط الدخول" },
    google: { en: "Continue with Google", ar: "كمّل مع Google" },
    checkEmail: {
      en: "Check your inbox. Tap the link we sent, or type the code from the email below.",
      ar: "شوف الإيميل تبعك. اضغط عالرابط يلي بعتناه، أو اكتب الرمز من الإيميل هون.",
    },
    code: { en: "Code from the email", ar: "الرمز من الإيميل" },
    verify: { en: "Sign in", ar: "تسجيل الدخول" },
    useOtherEmail: { en: "Use a different email", ar: "استعمل إيميل تاني" },
  },
  misc: {
    langName: { en: "العربية", ar: "English" },
    loading: { en: "Loading…", ar: "عم نحمّل…" },
    error: { en: "Something went wrong.", ar: "صار خطأ." },
  },
  preloader: {
    meep: { en: "BEEP BEEP!", ar: "بيب بيب!" },
    slogan: { en: "Be right. Be bright.", ar: "بي رايت. صح من أول مرة." },
    skip: { en: "Tap to skip", ar: "اضغط للتخطي" },
  },
};

export type Dict = typeof t;

export function pick(text: { en: string; ar: string }, lang: Lang): string {
  return lang === "ar" ? text.ar : text.en;
}
