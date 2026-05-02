const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

const TOKEN = "1298032521:0e6gFgSofkDLv9xP4XEAeWKHfuOjf78udTE";
const ADMIN_ID = "1305036722";
const API = `https://tapi.bale.ai/bot${TOKEN}`;

let userState = {};
let orders = [];

// ===== ذخیره در فایل =====
function saveOrders() {
  fs.writeFileSync("orders.json", JSON.stringify(orders, null, 2));
}

// ===== ارسال پیام =====
async function sendMessage(chatId, text, keyboard = null) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: keyboard
    })
  });
}

// ===== منوی اصلی =====
const mainMenu = {
  keyboard: [
    ["🌿 انتخاب عطر", "🎯 پیشنهاد بر اساس سلیقه"],
    ["🔥 پرفروش‌ترین‌ها", "💬 ارتباط با ما"]
  ],
  resize_keyboard: true
};

const tasteStep1 = {
  keyboard: [["🌊 خنک","🔥 گرم"],["🌿 معتدل"]],
  resize_keyboard: true
};

const tasteStep2 = {
  keyboard: [["🍭 شیرین","🖤 تلخ"],["🌸 ملایم"]],
  resize_keyboard: true
};

const tasteStep3 = {
  keyboard: [["🧑‍💼 روزمره","🎉 مهمانی"],["💼 رسمی"]],
  resize_keyboard: true
};

const perfumesMenu = {
  keyboard: [
    ["Dior Sauvage"],
    ["Creed Aventus"],
    ["Baccarat Rouge 540"],
    ["⬅️ بازگشت به منو"]
  ],
  resize_keyboard: true
};

const productMenu = {
  keyboard: [
    ["خرید ۳۰ میل"],
    ["خرید ۵۰ میل 🔥"],
    ["⬅️ بازگشت"]
  ],
  resize_keyboard: true
};


// ===== webhook =====
app.post("/", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userState[chatId]) userState[chatId] = {};

  // شروع
  if (text === "/start") {
    return sendMessage(chatId, 
`سلام 👋
به Manty خوش اومدی ✨

اینجا می‌تونی عطر مورد علاقه‌تو انتخاب کنی
و ما همون رو دست‌ساز برات آماده می‌کنیم 💎

از اینجا شروع کن 👇`, mainMenu);
  }

  // لیست عطر
  if (text === "🌿 انتخاب عطر" || text === "🔥 پرفروش‌ترین‌ها") {
    return sendMessage(chatId,
`🔥 انتخاب کن:

Dior Sauvage
Creed Aventus
Baccarat Rouge 540`);
  }
  
   // پیشنهاد سلیقه
  if (text === "🎯 پیشنهاد بر اساس سلیقه") {
    return sendMessage(chatId, "کدوم نوع رایحه رو دوست داری؟ 👇", tasteStep1);
  }

  if (["🌊 خنک","🔥 گرم","🌿 معتدل"].includes(text)) {
    return sendMessage(chatId, "چه حسی رو می‌پسندی؟ 👇", tasteStep2);
  }

  if (["🍭 شیرین","🖤 تلخ","🌸 ملایم"].includes(text)) {
    return sendMessage(chatId, "بیشتر کجا استفاده می‌کنی؟ 👇", tasteStep3);
  }

  if (["🧑‍💼 روزمره","🎉 مهمانی","💼 رسمی"].includes(text)) {
    return sendMessage(chatId,
`👌 بر اساس سلیقه‌ات اینا پیشنهاد میشه:

🔥 Dior Sauvage
🔥 Creed Aventus
🔥 Baccarat Rouge 540

انتخاب کن 👇`, perfumesMenu);
  }

  // انتخاب عطر
  if (["Dior Sauvage","Creed Aventus","Baccarat Rouge 540"].includes(text)) {
    userState[chatId].perfume = text;
    return sendMessage(chatId, "حجم؟ ۳۰ میل یا ۵۰ میل");
  }

  // انتخاب حجم
  if (text.includes("۳۰") || text.includes("۵۰")) {
    userState[chatId].size = text;
    userState[chatId].step = "name";
    return sendMessage(chatId, "نام:");
  }

  // گرفتن اطلاعات
  if (userState[chatId].step === "name") {
    userState[chatId].name = text;
    userState[chatId].step = "phone";
    return sendMessage(chatId, "شماره تماس:");
  }

  if (userState[chatId].step === "phone") {
    userState[chatId].phone = text;
    userState[chatId].step = "address";
    return sendMessage(chatId, "آدرس:");
  }

  if (userState[chatId].step === "address") {
    userState[chatId].address = text;

    const order = {
      id: Date.now(),
      ...userState[chatId],
      status: "در انتظار پرداخت"
    };

    orders.push(order);
    saveOrders();

    // ارسال به ادمین
    await sendMessage(ADMIN_ID,
`📦 سفارش جدید

🧴 ${order.perfume}
📦 ${order.size}

👤 ${order.name}
📞 ${order.phone}
📍 ${order.address}`);

    userState[chatId] = {};

    // پرداخت
    return sendMessage(chatId,
`سفارشت ثبت شد 🎉

💳 برای پرداخت:
کارت: 1234-5678-XXXX-XXXX

📸 رسید رو همینجا ارسال کن`);
  }

  // دریافت رسید پرداخت
  if (msg.photo || msg.document) {
    const lastOrder = orders[orders.length - 1];
    if (lastOrder) {
      lastOrder.status = "پرداخت شده";
      saveOrders();

      await sendMessage(ADMIN_ID, "💰 پرداخت انجام شد برای سفارش: " + lastOrder.id);

      return sendMessage(chatId,
`پرداختت تایید شد ✅

سفارشت در حال آماده‌سازیه
به زودی ارسال میشه 📦`);
    }
  }

  // ارتباط
  if (text === "💬 ارتباط با ما") {
    return sendMessage(chatId, "@SBeizaee");
  }


  // بازگشت‌ها
  if (text === "⬅️ بازگشت") {
    return sendMessage(chatId, "انتخاب کن 👇", perfumesMenu);
  }

  if (text === "⬅️ بازگشت به منو") {
    return sendMessage(chatId, "منوی اصلی 👇", mainMenu);
  }
}

  res.sendStatus(200);
});

// ===== اجرا =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Manty Bot Running 🚀"));