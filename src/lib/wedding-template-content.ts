export type WeddingTemplateLang = "en" | "ar";

export type WeddingTemplateEvent = {
  title: string;
  time: string;
  location: string;
  description: string;
};

export type WeddingTemplateCopy = {
  language: string;
  scroll: string;
  imageAreaLabel: string;
  useTemplateLabel: string;
  scheduleTitle: string;
  scheduleDate: string;
  venueLabel: string;
  venueTitle: string;
  venueName: string;
  hallInfo: string;
  directions: string;
  replyLabel: string;
  replyTitle: string;
  replySubtitle: string;
  deadline: string;
  firstName: string;
  lastName: string;
  attending: string;
  yes: string;
  no: string;
  guestsTitle: string;
  guestsSubtitle: string;
  add: string;
  party: string;
  male: string;
  female: string;
  gender: string;
  remove: string;
  send: string;
  sending: string;
  receivedLabel: string;
  thanksTitle: string;
  thanksMessage: string;
  duplicateGuest: string;
  errorGeneral: string;
  events: WeddingTemplateEvent[];
};

export const weddingTemplateText: Record<WeddingTemplateLang, WeddingTemplateCopy> = {
  en: {
    language: "العربية",
    scroll: "Scroll to RSVP",
    imageAreaLabel: "This area is for images.",
    useTemplateLabel: "Use this template",
    scheduleTitle: "Schedule of Events",
    scheduleDate: "Summer 2026",
    venueLabel: "Venue",
    venueTitle: "Getting There",
    venueName: "Private Event Hall",
    hallInfo: "Men's Hall: A · Women's Hall: F",
    directions: "Location shared with invited guests",
    replyLabel: "Kindly Reply",
    replyTitle: "RSVP",
    replySubtitle: "Please share your attendance details so we can prepare your place with care.",
    deadline: "Please reply two weeks before the event",
    firstName: "First Name",
    lastName: "Last Name",
    attending: "Will you be attending?",
    yes: "Yes",
    no: "No",
    guestsTitle: "Guests",
    guestsSubtitle: "Add each person attending, including you.",
    add: "Add",
    party: "Party",
    male: "Male",
    female: "Female",
    gender: "Gender",
    remove: "Remove",
    send: "Submit RSVP",
    sending: "Sending",
    receivedLabel: "RSVP Received",
    thanksTitle: "Thank you",
    thanksMessage: "Your response has been recorded. We are grateful to celebrate this day with the people closest to us.",
    duplicateGuest: "Each guest should only be listed once.",
    errorGeneral: "We could not save your RSVP. Please try again.",
    events: [
      { title: "Reception", time: "6:00 PM", location: "", description: "Enjoy drinks from our soft bar." },
      { title: "Zaffa & Dabka", time: "6:45 PM", location: "Hall A — Men", description: "Traditional Zaffa procession and Dabka folk dance." },
      { title: "Bride & Groom Entrance", time: "7:15 PM", location: "Hall F — Women", description: "The couple makes their grand entrance." },
      { title: "Dinner", time: "8:00 PM (Men) · 8:30 PM (Women)", location: "Hall A (Men) · Hall F (Women)", description: "Dinner in the respective halls." },
    ],
  },
  ar: {
    language: "English",
    scroll: "مرر لتأكيد الحضور",
    imageAreaLabel: "هذه المنطقة مخصصة للصور.",
    useTemplateLabel: "استخدم هذا القالب",
    scheduleTitle: "جدول الفعاليات",
    scheduleDate: "صيف ٢٠٢٦",
    venueLabel: "المكان",
    venueTitle: "كيف تصل",
    venueName: "قاعة خاصة للمناسبة",
    hallInfo: "قاعة الرجال: A · قاعة النساء: F",
    directions: "تتم مشاركة الموقع مع المدعوين",
    replyLabel: "الرجاء الرد",
    replyTitle: "تأكيد الحضور",
    replySubtitle: "يُرجى مشاركة تفاصيل حضورك حتى نتمكن من تجهيز مكانك باهتمام.",
    deadline: "يرجى الرد قبل المناسبة بأسبوعين",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    attending: "هل ستحضر؟",
    yes: "نعم",
    no: "لا",
    guestsTitle: "الضيوف",
    guestsSubtitle: "أضف كل شخص سيحضر، بما فيك أنت.",
    add: "إضافة",
    party: "المجموعة",
    male: "ذكر",
    female: "أنثى",
    gender: "الجنس",
    remove: "إزالة",
    send: "إرسال التأكيد",
    sending: "جارٍ الإرسال",
    receivedLabel: "تم استلام التأكيد",
    thanksTitle: "شكراً لك",
    thanksMessage: "تم تسجيل ردك. يسعدنا الاحتفال بهذا اليوم مع أعزّ الناس إلينا.",
    duplicateGuest: "لا يجب إدراج كل ضيف إلا مرة واحدة.",
    errorGeneral: "لم نتمكن من حفظ تأكيدك. يرجى المحاولة مرة أخرى.",
    events: [
      { title: "الاستقبال", time: "٦:٠٠ مساءً", location: "", description: "استمتع بالمشروبات من البار الخاص بنا." },
      { title: "الزفة والدبكة", time: "٦:٤٥ مساءً", location: "قاعة A — الرجال", description: "زفة تقليدية وعروض دبكة شعبية." },
      { title: "دخول العروسين", time: "٧:١٥ مساءً", location: "القاعة F — النساء", description: "يدخل العروسان بأبهى حلة." },
      { title: "العشاء", time: "٨:٠٠ مساءً (رجال) · ٨:٣٠ مساءً (نساء)", location: "قاعة A (رجال) · قاعة F (نساء)", description: "العشاء في القاعات المخصصة." },
    ],
  },
};

