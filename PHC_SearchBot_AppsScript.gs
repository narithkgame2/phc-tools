// ═══════════════════════════════════════════════════════════════
//  PHC CLIENT SEARCH BOT — 5-STEP SEARCH CONCIERGE (GOOGLE APPS SCRIPT)
//  Bot: @Nick_REAKH_Bot
//
//  MULTI-CHANNEL INVENTORY CHANNELS:
//  • @NickREAKH
//  • @malaynopsale
//  • @malaynoprental
//  • @RealEstateInformationSharing (Realestate.com.kh All Listings)
//  • @penghuothproperty (Peng Houth Luxury Villas & Borey)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_BOT_TOKEN = "8453711743:AAHj3SKU8orwO4ksev1z_xVvX0mNcm8_yq4";
const DEFAULT_NICK_CHAT_ID = "353195979";

const VERIFIED_INVENTORY = [
  {
    "id": "malaynoprental_32835",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "វីឡាឧត្តមធំកែងសម្រាប់ជួល $4,500/month",
    "price": 4500,
    "priceFormatted": "$4,500/mo",
    "location": "Phnom Penh",
    "beds": "5BR",
    "link": "https://t.me/malaynoprental/32835",
    "snippet": "វីឡាឧត្តមធំកែងសម្រាប់ជួល $4,500/month · 📍 Borey Chankiri - Preaek Kampues · Villa Super Udom (Corner) | 5 🛏 |  7🛁 | 🏷33358 · Features:"
  },
  {
    "id": "RealEstateInformationSharing_20406",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Loft Style Duplex 1 Bedroom Renovated House for Rent in Daun Penh area  🌟 | $300",
    "price": 300,
    "priceFormatted": "$300/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20406",
    "snippet": "🏡 Loft Style Duplex 1 Bedroom Renovated House for Rent in Daun Penh area  🌟 | $300 · 🆔 Property ID: 250007 · 🔑 Property Overview: · • Rental Price: $300 / month ( Price Can Be Negotiate )"
  },
  {
    "id": "RealEstateInformationSharing_20398",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Lovely 1 Bedroom Condo for Rent in BKK1 area  🌟 | $700",
    "price": 700,
    "priceFormatted": "$700/mo",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20398",
    "snippet": "🏡 Lovely 1 Bedroom Condo for Rent in BKK1 area  🌟 | $700 · 🆔 Property ID: 230154 · 🔑 Property Overview: · • Rental Price: $700 / month ( Price Can Be Negotiate )"
  },
  {
    "id": "RealEstateInformationSharing_20388",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Western Style 1 Bedroom Condo for Rent in BKK1 area  🌟 | $750",
    "price": 750,
    "priceFormatted": "$750/mo",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20388",
    "snippet": "🏡 Western Style 1 Bedroom Condo for Rent in BKK1 area  🌟 | $750 · 🆔 Property ID: 269410 · 🔑 Property Overview: · • Rental Price: $750 / month ( Price Can Be Negotiate )"
  },
  {
    "id": "malaynopsale_20650",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "One Park - Boeng Kak 1",
    "price": 195000,
    "priceFormatted": "$195,000 USD",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/malaynopsale/20650",
    "snippet": "#Newlisting ខុនដូសម្រាប់លក់ $195,000💫 · 📍One Park - Boeng Kak 1 · 6th Floor | 📐52.75m² | 1🛏 | 1🛁 | 🏷59404 · Features:"
  },
  {
    "id": "RealEstateInformationSharing_20381",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Big Kitchen 1 Bedroom Service Apartment for Rent in Tonle Bassac area  🌟 | $700",
    "price": 700,
    "priceFormatted": "$700/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20381",
    "snippet": "🏡 Big Kitchen 1 Bedroom Service Apartment for Rent in Tonle Bassac area  🌟 | $700 · 🆔 Property ID: 269409 · 🔑 Property Overview: · • Rental Price: $700 / month ( Price Can Be Negotiate )"
  },
  {
    "id": "malaynoprental_32823",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "វីឡាភ្លោះសម្រាប់ជួល $1,200/month",
    "price": 1200,
    "priceFormatted": "$1,200/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "4BR",
    "link": "https://t.me/malaynoprental/32823",
    "snippet": "វីឡាភ្លោះសម្រាប់ជួល $1,200/month · 📍Borey Peng Huoth Phum Morokot - Dangkao · Twin Villa | 4🛏 | 4🛁 | 🏷58448 · Features:"
  },
  {
    "id": "penghuothproperty_2160",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាភ្លោះ B មានសម្ភារៈស្រាប់ សម្រាប់ជួល |Fully Furnished Twin B Villa for Rent | Borey Peng Huoth Beoung Snor - Eco Romance",
    "price": 2000,
    "priceFormatted": "$2,000/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2160",
    "snippet": "#ForRent #Readytomovein 🏡✨ · វីឡាភ្លោះ B មានសម្ភារៈស្រាប់ សម្រាប់ជួល |Fully Furnished Twin B Villa for Rent | Borey Peng Huoth Beoung Snor - Eco Romance · 💰 តម្លៃជួល| Rental Price: $ 2,000/month  (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 8.5m x 25m（土地面积）"
  },
  {
    "id": "malaynopsale_20638",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "ខុនដូសម្រាប់លក់ – $65,000✨",
    "price": 65000,
    "priceFormatted": "$65,000 USD",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/malaynopsale/20638",
    "snippet": "ខុនដូសម្រាប់លក់ – $65,000✨ · 📍Residence L Boeng Trobek 2 | Boeng Trabaek · 15th | 📐50m² | 1🛏 | 1🛁 | 🏷53362 · Features:"
  },
  {
    "id": "NickREAKH_2877",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🇰🇭 TIME SQUARE 11 | NEW FLOOR PLANS RELEASED",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2877",
    "snippet": "🇰🇭 TIME SQUARE 11 | NEW FLOOR PLANS RELEASED · Megakim World Corporation has announced the new apartment layouts for Time Square 11, located in Phnom Penh. · 🗓 Expected Completion: Q3–Q4 2029 · 📊 Latest Update"
  },
  {
    "id": "malaynoprental_32812",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "Penthouse - BKK2",
    "price": 6500,
    "priceFormatted": "$6,500/mo",
    "location": "Phnom Penh",
    "beds": "3BR",
    "link": "https://t.me/malaynoprental/32812",
    "snippet": "#Newlisting ផេនហោសសម្រាប់ជួល $6,500/month · 📍Penthouse - BKK2 · 🏢 19th | 📐222m²  | 3 🛏 |  3🛁 | 🏷59422 · Features:"
  },
  {
    "id": "RealEstateInformationSharing_20371",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Best DEAL 3 Bedrooms Service Apartment for Rent in Toul Tompoung area  🌟 | $900",
    "price": 900,
    "priceFormatted": "$900/mo",
    "location": "Chamkarmon",
    "beds": "3BR",
    "link": "https://t.me/RealEstateInformationSharing/20371",
    "snippet": "🏡 Best DEAL 3 Bedrooms Service Apartment for Rent in Toul Tompoung area  🌟 | $900 · 🆔 Property ID: 269368 · 🔑 Property Overview: · • Rental Price: $900 / month ( Price Can Be Negotiate )"
  },
  {
    "id": "RealEstateInformationSharing_20361",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Brand New 3 Bedrooms Penthouse for Rent in Toul Tompoung area  🌟 | $2,500",
    "price": 2500,
    "priceFormatted": "$2,500/mo",
    "location": "Chamkarmon",
    "beds": "3BR",
    "link": "https://t.me/RealEstateInformationSharing/20361",
    "snippet": "🏡 Brand New 3 Bedrooms Penthouse for Rent in Toul Tompoung area  🌟 | $2,500 · 🆔 Property ID: 269365 · 🔑 Property Overview: · • Rental Price: $2,500 / month ( Price Can Be Negotiate )"
  },
  {
    "id": "RealEstateInformationSharing_20351",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Amazing 3 Bedrooms Penthouse for Rent in Toul Tompoung area  🌟 | $2,200",
    "price": 2200,
    "priceFormatted": "$2,200/mo",
    "location": "Chamkarmon",
    "beds": "3BR",
    "link": "https://t.me/RealEstateInformationSharing/20351",
    "snippet": "🏡 Amazing 3 Bedrooms Penthouse for Rent in Toul Tompoung area  🌟 | $2,200 · 🆔 Property ID: 269371 · 🔑 Property Overview: · • Rental Price: $2,200 / month"
  },
  {
    "id": "RealEstateInformationSharing_20341",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Big Balcony 1 Bedroom Service Apartment for Rent in BKK3 area  🌟 | $750",
    "price": 750,
    "priceFormatted": "$750/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20341",
    "snippet": "🏡 Big Balcony 1 Bedroom Service Apartment for Rent in BKK3 area  🌟 | $750 · 🆔 Property ID: 269373 · 🔑 Property Overview: · • Rental Price: $750 / month"
  },
  {
    "id": "malaynoprental_32800",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "អាផាតមិនសម្រាប់ជួល $900/month",
    "price": 900,
    "priceFormatted": "$900/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/malaynoprental/32800",
    "snippet": "អាផាតមិនសម្រាប់ជួល $900/month · 📍Serviced Apartment - Tonle Bassac · 8th | 📐90m² | 1🛏 | 1🛁 | 🏷54430 · Features:"
  },
  {
    "id": "malaynoprental_32788",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "អាផាតមិនសម្រាប់ជួល $800/month",
    "price": 800,
    "priceFormatted": "$800/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/malaynoprental/32788",
    "snippet": "អាផាតមិនសម្រាប់ជួល $800/month · 📍 Serviced Apartment - Tonle Bassac · 3rd | 📐90m² | 1🛏 | 1🛁 | 🏷54432 · Features:"
  },
  {
    "id": "penghuothproperty_2156",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះអាជីវកម្មប្រភេទ​ M សម្រាប់ជួល | Shophouse (SH-M) for Rent | Borey PH Beoung Snor - The Capital One",
    "price": 850,
    "priceFormatted": "$850/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2156",
    "snippet": "#ForRent #Commercialshophouse · 🏡✨ផ្ទះអាជីវកម្មប្រភេទ​ M សម្រាប់ជួល | Shophouse (SH-M) for Rent | Borey PH Beoung Snor - The Capital One · 💰  តម្លៃជួល| Rental Price: $ 850/month  (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 4.5m x 24.5m（土地面积）"
  },
  {
    "id": "malaynoprental_32777",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "អាផាតមិនសម្រាប់ជួល $2,800/month",
    "price": 2800,
    "priceFormatted": "$2,800/mo",
    "location": "BKK1",
    "beds": "2BR",
    "link": "https://t.me/malaynoprental/32777",
    "snippet": "អាផាតមិនសម្រាប់ជួល $2,800/month · 📍Serviced Apartment - BKK1 · 🏢 11th  | 📐110m² | 2🛏 | 2🛁 | 🏷20470 · Features:"
  },
  {
    "id": "penghuothproperty_2153",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "\udd25វីឡាភ្លោះB សម្រាប់លក់ | Twin B Villa for Sale | Borey Peng Huoth Beoung Snor - Eco Romance",
    "price": 365000,
    "priceFormatted": "$365,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2153",
    "snippet": "#ForSale #Goodprice #Greatchance 🏡✨ · 🔥វីឡាភ្លោះB សម្រាប់លក់ | Twin B Villa for Sale | Borey Peng Huoth Beoung Snor - Eco Romance · 💰  តម្លៃលក់ | Sale Price: $ 365,000 (ចរចារ/Negotiation) 售价可协商 · 🏡 ផ្ទះថ្មីស្អាត​​ | New Villa 全新别墅"
  },
  {
    "id": "penghuothproperty_2148",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាកូនកាត់ LV​ សម្រាប់ជួល |​Link House (LV) for Rent | Borey PH Beoung Snor - Eco Romance",
    "price": 700,
    "priceFormatted": "$700/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2148",
    "snippet": "#ForRent  #Readytomovein 🏡✨ · វីឡាកូនកាត់ LV​ សម្រាប់ជួល |​Link House (LV) for Rent | Borey PH Beoung Snor - Eco Romance · 💰 តម្លៃជួល| Rental Price: $ 700 (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 4.2m x 17m（土地面积）"
  },
  {
    "id": "malaynoprental_32766",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "អាផាតមិនសម្រាប់ជួល – $550/month",
    "price": 550,
    "priceFormatted": "$550/mo",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/malaynoprental/32766",
    "snippet": "អាផាតមិនសម្រាប់ជួល – $550/month · 📍Serviced Apartment | Tuol Tumpung II · 13th Floor | 📐70m² | 1🛏 | 1🛁 | 🏷24719 · Features:"
  },
  {
    "id": "malaynopsale_20626",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "ខុនដូសម្រាប់លក់ $680,000🍃",
    "price": 680000,
    "priceFormatted": "$680,000 USD",
    "location": "Toul Kork",
    "beds": "3BR",
    "link": "https://t.me/malaynopsale/20626",
    "snippet": "ខុនដូសម្រាប់លក់ $680,000🍃 · 📍Time Square 2 (Type A2) - Boeng Kak 2 · 🏢29th | 📐270m²  | 3🛏 | 3🛁 | 🏷53432 · Features:"
  },
  {
    "id": "malaynoprental_32755",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "អាផាតមិនសម្រាប់ជួល $850/month",
    "price": 850,
    "priceFormatted": "$850/mo",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/malaynoprental/32755",
    "snippet": "អាផាតមិនសម្រាប់ជួល $850/month · 📍Serviced Apartment - Tuol Tumpung II · 🏢 10th | 📐125m² | 2🛏 | 2🛁 | 🏷24716 · Features:"
  },
  {
    "id": "malaynoprental_32743",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "ខុនដូសម្រាប់ជួល $1,800/month 💫",
    "price": 1800,
    "priceFormatted": "$1,800/mo",
    "location": "BKK1",
    "beds": "3BR",
    "link": "https://t.me/malaynoprental/32743",
    "snippet": "ខុនដូសម្រាប់ជួល $1,800/month 💫 · 📍 De Castle Royal - BKK1 · 17th | 📐165m² | 3🛏 | 3🛁 | 🏷43441 · Features:"
  },
  {
    "id": "malaynoprental_32732",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "អាផាតមិនសម្រាប់ជួល $2,200/month✨",
    "price": 2200,
    "priceFormatted": "$2,200/mo",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/malaynoprental/32732",
    "snippet": "អាផាតមិនសម្រាប់ជួល $2,200/month✨ · 📍 ServicedApartment - Boeng Reang · 4th | 📐150m² | 2🛏 | 2🛁 | 🏷21900 · Features:"
  },
  {
    "id": "malaynoprental_32721",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "អាផាតមិនសម្រាប់ជួល $1,900/month",
    "price": 1900,
    "priceFormatted": "$1,900/mo",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/malaynoprental/32721",
    "snippet": "អាផាតមិនសម្រាប់ជួល $1,900/month · 📍Serviced Apartment (Type C) - BKK2 · 🏢 14th  | 📐101m² | 2🛏 | 2🛁 | 🏷22729 · Features:"
  },
  {
    "id": "malaynoprental_32709",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "ផេនហោសសម្រាប់ជួល $3,000/month",
    "price": 3000,
    "priceFormatted": "$3,000/mo",
    "location": "BKK1",
    "beds": "3BR",
    "link": "https://t.me/malaynoprental/32709",
    "snippet": "ផេនហោសសម្រាប់ជួល $3,000/month · 📍Penthouse (Building B) - BKK1 · 🏢 11th | 📐225m²  | 3 🛏 |  4 🛁 | 🏷34899 · Features:"
  },
  {
    "id": "malaynopsale_20615",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "The Penthouse Residence - Tonle Bassac",
    "price": 150000,
    "priceFormatted": "$150,000 USD",
    "location": "Tonle Bassac",
    "beds": "2BR",
    "link": "https://t.me/malaynopsale/20615",
    "snippet": "#Newlisting ខុនដូសម្រាប់លក់ $150,000 · 📍The Penthouse Residence - Tonle Bassac · 16th | 📐68m² | 2🛏 | 1🛁 | 🏷59366 · Features:"
  },
  {
    "id": "malaynoprental_32697",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "ខុនដូសម្រាប់ជួល $380/month",
    "price": 380,
    "priceFormatted": "$380/mo",
    "location": "Phnom Penh",
    "beds": "Studio",
    "link": "https://t.me/malaynoprental/32697",
    "snippet": "ខុនដូសម្រាប់ជួល $380/month · 📍East One - Boeng Reang · 🏢 17th | 📐38m²  | 1🛏 | 1🛁 | 🏷56108 · Features:"
  },
  {
    "id": "malaynopsale_20604",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "ខុនដូសម្រាប់លក់ $66,000",
    "price": 66000,
    "priceFormatted": "$66,000 USD",
    "location": "Chamkarmon",
    "beds": "2BR",
    "link": "https://t.me/malaynopsale/20604",
    "snippet": "ខុនដូសម្រាប់លក់ $66,000 · 📍Residence L Boeung Tumpun · 6th | 📐70.63m² | 2🛏 | 2🛁 | 🏷52596 · Features:"
  },
  {
    "id": "malaynoprental_32686",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "GIA Tower - Tonle Bassac",
    "price": 3000,
    "priceFormatted": "$3,000/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/malaynoprental/32686",
    "snippet": "#Newlisting ការិយាល័យសម្រាប់ជួល $3,000/month🧑‍💼💼 · 📍GIA Tower - Tonle Bassac · 🏢22nd Floor | 📐115.44m² | 🏷 59215 · Features:"
  },
  {
    "id": "malaynoprental_32675",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "Renovated Flat - BKK1",
    "price": 600,
    "priceFormatted": "$600/mo",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/malaynoprental/32675",
    "snippet": "#Newlisting Flat សម្រាប់ជួល $600/month · 📍Renovated Flat - BKK1 · 6th | 📐50m²  | 1🛏 |  1🛁 | 🏷59243 · Features:"
  },
  {
    "id": "malaynopsale_20592",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "វីឡាសម្រាប់លក់ $1,300,000",
    "price": 1300000,
    "priceFormatted": "$1,300,000 USD",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/malaynopsale/20592",
    "snippet": "វីឡាសម្រាប់លក់ $1,300,000 · 📍Bassac Garden City | សង្កាត់ទន្លេបាសាក់ · បន្ទប់គេង 3 | បន្ទប់ទឹក 3 | 🏷56789 · លក្ខណៈពិសេស:"
  },
  {
    "id": "malaynoprental_32664",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "Penthouse - BKK1",
    "price": 6000,
    "priceFormatted": "$6,000/mo",
    "location": "BKK1",
    "beds": "4BR",
    "link": "https://t.me/malaynoprental/32664",
    "snippet": "#Newlisting ផេនហោសសម្រាប់ជួល $6,000/month · 📍Penthouse - BKK1 · 17th/18th | 📐500m²  | 4🛏 |  4🛁 | 🏷59241 · Features:"
  },
  {
    "id": "malaynoprental_32652",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "ខុនដូសម្រាប់ជួល $1,300/month",
    "price": 1300,
    "priceFormatted": "$1,300/mo",
    "location": "Tonle Bassac",
    "beds": "3BR",
    "link": "https://t.me/malaynoprental/32652",
    "snippet": "ខុនដូសម្រាប់ជួល $1,300/month · 📍The Peak (Tower 2) - Tonle Bassac · 🏢 22nd | 📐89.50m²  | 3🛏 | 2🛁 | 🏷56086 · Features:"
  },
  {
    "id": "malaynopsale_20580",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "Flat សម្រាប់លក់ $75,000🍃",
    "price": 75000,
    "priceFormatted": "$75,000 USD",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/malaynopsale/20580",
    "snippet": "Flat សម្រាប់លក់ $75,000🍃 · 📍Flat Off Street 19 - Chey Chummeah · 📐62.5m² | 2🛏 | 2🛁 | 🏷54062 · Features:"
  },
  {
    "id": "malaynoprental_32641",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "Serviced Apartment - BKK1",
    "price": 2800,
    "priceFormatted": "$2,800/mo",
    "location": "BKK1",
    "beds": "2BR",
    "link": "https://t.me/malaynoprental/32641",
    "snippet": "#Newlisting អាផាតមិនសម្រាប់ជួល $2,800/month · 📍Serviced Apartment - BKK1 · 11th | 📐160m² | 2🛏 | 3🛁 | 🏷59018 · Features:"
  },
  {
    "id": "malaynopsale_20569",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "ខុនដូសម្រាប់លក់ $90,000🔥",
    "price": 90000,
    "priceFormatted": "$90,000 USD",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/malaynopsale/20569",
    "snippet": "ខុនដូសម្រាប់លក់ $90,000🔥 · 📍Morgan EnMaison - Chrouy Changvar · 28th | 📐51.46m² | 2🛏 | 1🛁 | 🏷44492 · Features:"
  },
  {
    "id": "malaynopsale_20558",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "Time Square 5 - BKK1",
    "price": 125000,
    "priceFormatted": "$125,000 USD",
    "location": "BKK1",
    "beds": "2BR",
    "link": "https://t.me/malaynopsale/20558",
    "snippet": "#Newlisting ខុនដូសម្រាប់លក់ $125,000 · 📍Time Square 5 - BKK1 · 34th | 📐60m² | 2🛏 | 2🛁 | 🏷59245 · Features:"
  },
  {
    "id": "malaynopsale_20547",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "East One - Boeng Reang",
    "price": 90000,
    "priceFormatted": "$90,000 USD",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/malaynopsale/20547",
    "snippet": "#Newlisting ខុនដូសម្រាប់លក់ $90,000 · 📍East One - Boeng Reang · 17th | 📐84.50m² | 2🛏 | 2🛁 | 🏷59084 · Features:"
  },
  {
    "id": "malaynopsale_20535",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "Cluster House សម្រាប់លក់ $268,000",
    "price": 268000,
    "priceFormatted": "$268,000 USD",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/malaynopsale/20535",
    "snippet": "Cluster House សម្រាប់លក់ $268,000 · 📍The Palm (No.64) | សង្កាត់​វាលស្បូវ · 📐300m² | បន្ទប់គេង5 | បន្ទប់ទឹក6  | 🏷52965 · លក្ខណៈពិសេស:"
  },
  {
    "id": "malaynopsale_20524",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "ខុនដូសម្រាប់លក់ $93,100🌿",
    "price": 93100,
    "priceFormatted": "$93,100 USD",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/malaynopsale/20524",
    "snippet": "ខុនដូសម្រាប់លក់ $93,100🌿 · 📍Urban Village Phase 2 - Chak Angrae Leu · 51st | 📐66.50m² | 1🛏 | 2🛁 | 🏷53010 · Features:"
  },
  {
    "id": "malaynopsale_20513",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "ខុនដូសម្រាប់លក់ $250,000",
    "price": 250000,
    "priceFormatted": "$250,000 USD",
    "location": "BKK1",
    "beds": "3BR",
    "link": "https://t.me/malaynopsale/20513",
    "snippet": "ខុនដូសម្រាប់លក់ $250,000 · 📍Time Square 5 (Type X2) - BKK1 · 40th | 📐90m² | 3🛏 | 3🛁 | 🏷53244 · Features:"
  },
  {
    "id": "RealEstateInformationSharing_20331",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Brightly Penthouse 3 Bedrooms For Rent in Toul Kork area  🌟 | $1,500",
    "price": 1500,
    "priceFormatted": "$1,500/mo",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20331",
    "snippet": "🏡 Brightly Penthouse 3 Bedrooms For Rent in Toul Kork area  🌟 | $1,500 · 🆔 Property ID: 237060 · 🔑 Property Overview: · • Rental Price: $1,500 / month"
  },
  {
    "id": "RealEstateInformationSharing_20321",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Beautiful 3 Bedrooms Service Apartment for Rent near Toul Tompoung area  🌟 | $1,250",
    "price": 1250,
    "priceFormatted": "$1,250/mo",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20321",
    "snippet": "🏡 Beautiful 3 Bedrooms Service Apartment for Rent near Toul Tompoung area  🌟 | $1,250 · 🆔 Property ID: 239169 · 🔑 Property Overview: · • Rental Price: $1,250 / month"
  },
  {
    "id": "RealEstateInformationSharing_20312",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Spacious 1 Bedroom Service Apartment for Rent in Toul Kork area with Pool  🌟 | $680",
    "price": 680,
    "priceFormatted": "$680/mo",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20312",
    "snippet": "🏡 Spacious 1 Bedroom Service Apartment for Rent in Toul Kork area with Pool  🌟 | $680 · 🆔 Property ID: 237597 · 🔑 Property Overview: · • Rental Price: $680 / month"
  },
  {
    "id": "RealEstateInformationSharing_20302",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Unique 1 Bedroom Service Apartment for Rent in Toul Tompoung area  🌟 | $600",
    "price": 600,
    "priceFormatted": "$600/mo",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20302",
    "snippet": "🏡 Unique 1 Bedroom Service Apartment for Rent in Toul Tompoung area  🌟 | $600 · 🆔 Property ID: 241334 · 🔑 Property Overview: · • Rental Price: $600 / month"
  },
  {
    "id": "malaynopsale_20502",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "ខុនដូសម្រាប់លក់ $135,000💫",
    "price": 135000,
    "priceFormatted": "$135,000 USD",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/malaynopsale/20502",
    "snippet": "ខុនដូសម្រាប់លក់ $135,000💫 · 📍Embassy Residences - Tonle Bassac · 13th | 📐60.10m² | 1🛏 | 1🛁 | 🏷53429 · Features:"
  },
  {
    "id": "malaynoprental_32596",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "Pring Residence - BKK3",
    "price": 450,
    "priceFormatted": "$450/mo",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/malaynoprental/32596",
    "snippet": "អាផាតមិនសម្រាប់ជួល /month · 📍Serviced Apartment | BKK3 · 8th | 📐50m² | 1🛏 | 1🛁 | 🏷56104 · Features: Thoughtful layout, built-in display shelves"
  },
  {
    "id": "malaynoprental_32574",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "Serviced Apartment - Boeng Kak 1",
    "price": 300,
    "priceFormatted": "$300/mo",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/malaynoprental/32574",
    "snippet": "#Newlisting អាផាតមិនសម្រាប់ជួល /month · 📍Serviced Apartment - Boeng Kak 1 · 1st | 📐50m² | 1🛏 | 1🛁 | 🏷59077"
  },
  {
    "id": "malaynoprental_32562",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "J Tower 1 (Type A7) - Tonle Bassac",
    "price": 600,
    "priceFormatted": "$600/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/malaynoprental/32562",
    "snippet": "ខុនដូសម្រាប់ជួល /month · 📍J Tower 1 (Type A7) - Tonle Bassac · 14th | 📐45m² | 1🛏 | 1🛁 | 🏷56787 · Features: Fully furnished, Rooftop facilities, Mgmt Fee Included"
  },
  {
    "id": "NickREAKH_2876",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🇰🇭 GORDON RAMSAY BURGER COMING TO PHNOM PENH",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2876",
    "snippet": "🇰🇭 GORDON RAMSAY BURGER COMING TO PHNOM PENH · 🍔 World-renowned chef Gordon Ramsay is bringing Gordon Ramsay Burger to Cambodia in partnership with JS Group. It will be the brand’s first restaurant in Southeast Asia. · 📍 Location: 42nd floor of JS TOWER, on the rooftop of Planet Hollywood Hotel, Phnom Penh. · ✨ What to expect"
  },
  {
    "id": "malaynopsale_20490",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "ខុនដូសម្រាប់លក់ $220,000🍃",
    "price": 220000,
    "priceFormatted": "$220,000 USD",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/malaynopsale/20490",
    "snippet": "ខុនដូសម្រាប់លក់ $220,000🍃 · 📍La Vista One - Chrouy Changvar · 20th | 📐85.17m² | 2🛏 | 2🛁 | 🏷54100 · Features:"
  },
  {
    "id": "NickREAKH_2875",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🏡 Nick’s Real Estate 🇰🇭 pinned a photo",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2875",
    "snippet": "🏡 Nick’s Real Estate 🇰🇭 pinned a photo"
  },
  {
    "id": "malaynopsale_20479",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "The Bridge | Tonle Bassac",
    "price": 158000,
    "priceFormatted": "$158,000 USD",
    "location": "Tonle Bassac",
    "beds": "2BR",
    "link": "https://t.me/malaynopsale/20479",
    "snippet": "#UrgentSale ខុនដូសម្រាប់លក់ – $158,000 · 📍The Bridge | Tonle Bassac · 45th | 📐91m² | 2🛏 | 2🛁 | 🏷45470 · Features:"
  },
  {
    "id": "RealEstateInformationSharing_20294",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Modern 1 Bedroom Apartment for Rent in Toul Tompoung area 🌟 | $500",
    "price": 500,
    "priceFormatted": "$500/mo",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20294",
    "snippet": "🏡 Modern 1 Bedroom Apartment for Rent in Toul Tompoung area 🌟 | $500 · 🆔 Property ID: 263094 · 🔑 Property Overview: · • Rental Price: $500 / month"
  },
  {
    "id": "RealEstateInformationSharing_20285",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Brightly 1 Bedroom Apartment for Rent in Toul Tompoung area 🌟 | $600",
    "price": 600,
    "priceFormatted": "$600/mo",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20285",
    "snippet": "🏡 Brightly 1 Bedroom Apartment for Rent in Toul Tompoung area 🌟 | $600 · 🆔 Property ID: 263094 · 🔑 Property Overview: · • Rental Price: $600 / month"
  },
  {
    "id": "RealEstateInformationSharing_20275",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Nice Design 4 Bedrooms Apartment for Rent in Tonle Bassac area 🌟 | $2,000",
    "price": 2000,
    "priceFormatted": "$2,000/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20275",
    "snippet": "🏡 Nice Design 4 Bedrooms Apartment for Rent in Tonle Bassac area 🌟 | $2,000 · 🆔 Property ID: 268926 · 🔑 Property Overview: · • Rental Price: $2,000 / month"
  },
  {
    "id": "RealEstateInformationSharing_20265",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Luxury Penthouse 4 Bedrooms Condo for Rent in 7 Makara area 🌟 | $4,800",
    "price": 4800,
    "priceFormatted": "$4,800/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20265",
    "snippet": "🏡 Luxury Penthouse 4 Bedrooms Condo for Rent in 7 Makara area 🌟 | $4,800 · 🆔 Property ID: 265250 · 🔑 Property Overview: · • Rental Price: $4,800 / month"
  },
  {
    "id": "RealEstateInformationSharing_20255",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Gorgeous 2 Bedrooms Service Apartment for Rent in 7 Makara area 🌟 | $800",
    "price": 800,
    "priceFormatted": "$800/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20255",
    "snippet": "🏡 Gorgeous 2 Bedrooms Service Apartment for Rent in 7 Makara area 🌟 | $800 · 🆔 Property ID: 267944 · 🔑 Property Overview: · • Rental Price: $800 / month"
  },
  {
    "id": "malaynopsale_20468",
    "type": "Sale",
    "channel": "@malaynopsale",
    "title": "De Castle Royal | BKK1",
    "price": 290000,
    "priceFormatted": "$290,000 USD",
    "location": "BKK1",
    "beds": "3BR",
    "link": "https://t.me/malaynopsale/20468",
    "snippet": "ខុនដូសម្រាប់លក់ - $290,000 · 📍 De Castle Royal | BKK1 · 12th | 📐165.89m² | 3🛏 | 3🛁 | 🏷34461 · Features:"
  },
  {
    "id": "malaynoprental_32551",
    "type": "Rent",
    "channel": "@malaynoprental",
    "title": "East One - Boeng Reang",
    "price": 750,
    "priceFormatted": "$750/mo",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/malaynoprental/32551",
    "snippet": "#Newlisting ខុនដូសម្រាប់ជួល /month · 📍East One - Boeng Reang · 17th | 📐84.50m² | 2🛏 | 2🛁 | 🏷59084 · Features: 2BR layout, rooftop pool"
  },
  {
    "id": "penghuothproperty_2141",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "វីឡាព្រីនB សម្រាប់លក់​| Prince B Villa for Sale| Borey Peng Huoth Beoung Snor - Roseville Project",
    "price": 1050000,
    "priceFormatted": "$1,050,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2141",
    "snippet": "#ForSale  🏡✨ · វីឡាព្រីនB សម្រាប់លក់​| Prince B Villa for Sale| Borey Peng Huoth Beoung Snor - Roseville Project · 💰 តម្លៃលក់ | Sale Price: $1,050,000 (ចរចារ/Negotiation) · 📐 ទំហំដី | Land Size: 15m x 30m（土地面积）"
  },
  {
    "id": "penghuothproperty_2134",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "\udcb0 តម្លៃលក់ | Sale Price: $145,000 (ចរចារ/Negotiation) 价格可协商",
    "price": 145000,
    "priceFormatted": "$145,000/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2134",
    "snippet": "#ForSale #ForRent #Commercialshophouse🏡✨ផ្ទះអាជីវកម្មប្រភេទ D សម្រាប់លក់ឬជួល| Shophouse (SH-D) for Sale/Rent| Borey PH Beoung Snor Polaris II | 炳发城店屋出售 · 💰 តម្លៃលក់ | Sale Price: $145,000 (ចរចារ/Negotiation) 价格可协商 · 💰តម្លៃជួល | Rental Price: $ 700/month (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 4.2m x 17m（土地面积）"
  },
  {
    "id": "RealEstateInformationSharing_20247",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Amazing 2 Bedrooms Service Apartment for Rent in Tonle Bassac area 🌟 | $1,300 (Direct Owner)",
    "price": 1300,
    "priceFormatted": "$1,300/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20247",
    "snippet": "🏡 Amazing 2 Bedrooms Service Apartment for Rent in Tonle Bassac area 🌟 | $1,300 (Direct Owner) · 🆔 Property ID: 262374 · 🔑 Property Overview: · • Rental Price: $1,300 / month (Open for Negotiate)"
  },
  {
    "id": "RealEstateInformationSharing_20236",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Spacious 1 Bedroom Service Apartment for Rent in Tonle Bassac area 🌟 | $800 (Direct Owner)",
    "price": 800,
    "priceFormatted": "$800/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20236",
    "snippet": "🏡 Spacious 1 Bedroom Service Apartment for Rent in Tonle Bassac area 🌟 | $800 (Direct Owner) · 🆔 Property ID: 262372 · 🔑 Property Overview: · • Rental Price: $800 / month (Open for Negotiate)"
  },
  {
    "id": "RealEstateInformationSharing_20228",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Best Location 1 Bedroom Condo for Rent near AEON1 🌟 | $400 (Direct Owner)",
    "price": 400,
    "priceFormatted": "$400/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20228",
    "snippet": "🏡 Best Location 1 Bedroom Condo for Rent near AEON1 🌟 | $400 (Direct Owner) · 🆔 Property ID: 268742 · 🔑 Property Overview: · • Rental Price: $400 / month (Open for Negotiate)"
  },
  {
    "id": "RealEstateInformationSharing_20221",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 Bright and Modern 1 Bedroom Condo for Rent in Tonle Bassac area with Pool 🌟 | $450 (Direct Owner)",
    "price": 450,
    "priceFormatted": "$450/mo",
    "location": "Tonle Bassac",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20221",
    "snippet": "🏡 Bright and Modern 1 Bedroom Condo for Rent in Tonle Bassac area with Pool 🌟 | $450 (Direct Owner) · 🆔 Property ID: 268771 · 🔑 Property Overview: · • Rental Price: $450 / month (Open for Negotiate)"
  },
  {
    "id": "NickREAKH_2874",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🌿 Happy Pchum Ben Holiday&#33; 🇰🇭",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2874",
    "snippet": "🌿 Happy Pchum Ben Holiday&#33; 🇰🇭 · May this special occasion bring peace, happiness, good health, and blessings to you and your family. · Wishing everyone a meaningful time of remembrance, gratitude, and togetherness with loved ones. · 🙏 សូមជូនពរឱ្យបងប្អូនទាំងអស់គ្នា មានសុខភាពល្អ សុភមង្គល និងសំណាងល្អក្នុងឱកាសបុណ្យភ្ជុំបិណ្ឌ&#33;"
  },
  {
    "id": "RealEstateInformationSharing_20220",
    "type": "Sale",
    "channel": "@RealEstateInformationSharing",
    "title": "Honoring Pchum Ben Festival From Realestate.com.kh. Wishing everyone a holiday filled with peace, prosperity, and blessings.",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20220",
    "snippet": "Honoring Pchum Ben Festival From Realestate.com.kh. Wishing everyone a holiday filled with peace, prosperity, and blessings."
  },
  {
    "id": "NickREAKH_2866",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗥𝗘𝗦𝗜𝗗𝗘𝗡𝗖𝗘 𝗟 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 35000,
    "priceFormatted": "$35,000 USD",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2866",
    "snippet": "#ForSale $35,000 · 𝗥𝗘𝗦𝗜𝗗𝗘𝗡𝗖𝗘 𝗟 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 Boeung Tumpun, Phnom Penh · ――――――――――"
  },
  {
    "id": "penghuothproperty_2129",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះអាជីវកម្ម​ប្រភេទ​ C សម្រាប់ជួល | Shophouse (SH-C) for Rent | Borey PH Beoung Snor - POLARIS 1",
    "price": 1000,
    "priceFormatted": "$1,000/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2129",
    "snippet": "#ForRent #Commercialshophouse 🏡✨ · ផ្ទះអាជីវកម្ម​ប្រភេទ​ C សម្រាប់ជួល | Shophouse (SH-C) for Rent | Borey PH Beoung Snor - POLARIS 1 · 💰 តម្លៃជួល| Rental Price: $ 1,000/month   (ចរចារ/Negotiation)租金可协商 · 📐ទំហំដី | Land Size: 4.5m x 20m（土地面积）"
  },
  {
    "id": "RealEstateInformationSharing_20212",
    "type": "Rent",
    "channel": "@RealEstateInformationSharing",
    "title": "🏡 River View 1 Bedroom Condo for Rent in Chroy Changva area 🌟 | $350 (Direct Owner)",
    "price": 350,
    "priceFormatted": "$350/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/RealEstateInformationSharing/20212",
    "snippet": "🏡 River View 1 Bedroom Condo for Rent in Chroy Changva area 🌟 | $350 (Direct Owner) · 🆔 Property ID: 268483 · 🔑 Property Overview: · • Rental Price: $350 / month (Open for Negotiate)"
  },
  {
    "id": "penghuothproperty_2123",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាភ្លោះ B មានសម្ភារៈស្រាប់ សម្រាប់ជួល |Twin B Villa for Rent | Borey Peng Huoth 60M - The Star Diamond",
    "price": 1500,
    "priceFormatted": "$1,500/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2123",
    "snippet": "#ForRent #Readytomovein 🏡✨ · វីឡាភ្លោះ B មានសម្ភារៈស្រាប់ សម្រាប់ជួល |Twin B Villa for Rent | Borey Peng Huoth 60M - The Star Diamond · 💰 តម្លៃជួល| Rental Price: $ 1,500/month  (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 7.5m x 25m（土地面积）"
  },
  {
    "id": "NickREAKH_2865",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "How Long Does It Take to Buy Property in Cambodia?",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2865",
    "snippet": "How Long Does It Take to Buy Property in Cambodia? · 07 October, 2026 · Buying property in Cambodia can take several weeks to several months, depending on the property type, title and transaction. This guide explains each stage, from booking and due diligence to SPA signing, handover and title transfer, with separate timelines for off-plan and resale properties. · READ MORE:"
  },
  {
    "id": "penghuothproperty_2116",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាចាស្មីនណា ម៉ូដឺន​ សម្រាប់លក់ឬ​ ជួល | JASMINA MODERN Villa for Sale/Rent | Borey PH Beoung Snor - Eco Poli 2",
    "price": 500000,
    "priceFormatted": "$500,000/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2116",
    "snippet": "#ForSale #ForRent #NewlyListing 🏡✨ · វីឡាចាស្មីនណា ម៉ូដឺន​ សម្រាប់លក់ឬ​ ជួល | JASMINA MODERN Villa for Sale/Rent | Borey PH Beoung Snor - Eco Poli 2 · 💰 តម្លៃលក់ | Sale Price: $500,000​​ (ចរចារ/Negotiation) 价格可协商 · 💰តម្លៃជួល | Rental Price: $ 2,000/month (ចរចារ/Negotiation) 价格可协商"
  },
  {
    "id": "penghuothproperty_2111",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះល្វែងកូនកាត់ LA​ សម្រាប់ជួល |​Link House (LA) for Rent | Borey PH Beoung Snor - Roseville",
    "price": 850,
    "priceFormatted": "$850/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2111",
    "snippet": "#ForRent #Newlisting #Readymovein 🏡✨ · ផ្ទះល្វែងកូនកាត់ LA​ សម្រាប់ជួល |​Link House (LA) for Rent | Borey PH Beoung Snor - Roseville · 💰តម្លៃជួល | Rental Price: $ 850/month (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 5m x 20m（土地面积）"
  },
  {
    "id": "penghuothproperty_2105",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "\udd25វីឡាភ្លោះB កែង សម្រាប់លក់ | Corner Twin B Villa for Sale | Borey PH Beoung Snor - Roseville",
    "price": 398000,
    "priceFormatted": "$398,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2105",
    "snippet": "#ForSale #PriceReduced 🏡✨ · 🔥វីឡាភ្លោះB កែង សម្រាប់លក់ | Corner Twin B Villa for Sale | Borey PH Beoung Snor - Roseville · 💰  តម្លៃលក់ | Sale Price Only: 🔥$398,000 (ចរចារ/Negotiation) 售价可协商 · 💰  តម្លៃលក់ពីមុន | Previous Price: $450,000"
  },
  {
    "id": "penghuothproperty_2101",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "\udcb0 តម្លៃលក់ | Sale Price: $125,000 (ចរចារ/Negotiation) 价格可协商",
    "price": 125000,
    "priceFormatted": "$125,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2101",
    "snippet": "#ForSale #Commercialshophouse🏡✨ផ្ទះអាជីវកម្មប្រភេទ D សម្រាប់លក់ | Shophouse (SH-D) for Sale | Borey PH Beoung Snor Polaris II | 炳发城店屋出售 · 💰 តម្លៃលក់ | Sale Price: $125,000 (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 4.2m x 17m（土地面积） · 🏠 ទំហំផ្ទះ | House Size: 4.2m x 10m（别墅面积）"
  },
  {
    "id": "penghuothproperty_2095",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាចាស្មីនណាដ៏ស្រស់ស្អាត សម្រាប់លក់ឬ​ ជួល |",
    "price": 850000,
    "priceFormatted": "$850,000/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2095",
    "snippet": "#ForSale #ForRent #Newlisting 🏡✨ · វីឡាចាស្មីនណាដ៏ស្រស់ស្អាត សម្រាប់លក់ឬ​ ជួល | · Gorgeous JASMINA Villa for Sale/Rent | Borey PH Beoung Snor - Rosato Project · 💰 តម្លៃលក់ | Sale Price: $850,000​​"
  },
  {
    "id": "NickREAKH_2864",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟳 | 𝗡𝗘𝗪 𝗟𝗔𝗬𝗢𝗨𝗧",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2864",
    "snippet": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟳 | 𝗡𝗘𝗪 𝗟𝗔𝗬𝗢𝗨𝗧 · 📍 Toul Kork, Phnom Penh · 𝗣𝗥𝗢𝗠𝗢𝗧𝗜𝗢𝗡 · ✅ 1 Bedroom Duplex"
  },
  {
    "id": "NickREAKH_2857",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟰𝗕𝗥 𝗗𝗨𝗣𝗟𝗘𝗫",
    "price": 395000,
    "priceFormatted": "$395,000 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2857",
    "snippet": "#ForSale – $395,000 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟰𝗕𝗥 𝗗𝗨𝗣𝗟𝗘𝗫 · 📍 BKK1, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2850",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟰𝗕𝗥 𝗗𝗨𝗣𝗟𝗘𝗫 𝗞𝗜𝗡𝗚",
    "price": 390000,
    "priceFormatted": "$390,000 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2850",
    "snippet": "#ForSale $390,000 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟰𝗕𝗥 𝗗𝗨𝗣𝗟𝗘𝗫 𝗞𝗜𝗡𝗚 · 📍 BKK1 · 𝗨𝗡𝗜𝗧 𝗗𝗘𝗧𝗔𝗜𝗟𝗦"
  },
  {
    "id": "NickREAKH_2840",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟭𝗕𝗥 𝗥𝗘𝗦𝗔𝗟𝗘",
    "price": 98000,
    "priceFormatted": "$98,000 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2840",
    "snippet": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟭𝗕𝗥 𝗥𝗘𝗦𝗔𝗟𝗘 · 💰 $98,000 → $94,000 · 📍 BKK1, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2839",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🌿 Making the trip to Siem Reap for Pchum Ben? Take some time to explore Siem Reap&#39;s exciting real estate opportunities. Join us for an exclusive 2-hour property tour and discover:",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2839",
    "snippet": "🌿 Making the trip to Siem Reap for Pchum Ben? Take some time to explore Siem Reap&#39;s exciting real estate opportunities. Join us for an exclusive 2-hour property tour and discover: · ✅ Insights on living and investing in Siem Reap · ✅ Specially selected properties options · ✅ Expert guidance from our property consultants"
  },
  {
    "id": "NickREAKH_2838",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟳 | 𝗡𝗘𝗪 𝗟𝗔𝗬𝗢𝗨𝗧",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2838",
    "snippet": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟳 | 𝗡𝗘𝗪 𝗟𝗔𝗬𝗢𝗨𝗧 · 📍 Toul Kork, Phnom Penh · 𝗣𝗥𝗢𝗠𝗢𝗧𝗜𝗢𝗡 · ✅ 1 Bedroom Duplex"
  },
  {
    "id": "penghuothproperty_2091",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះល្វែងកូនកាត់ LC2​ សម្រាប់ជួល |​Link House (LC2) for Rent | Borey Peng Huoth Beoung Snor - Mercurean 2",
    "price": 500,
    "priceFormatted": "$500/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2091",
    "snippet": "#ForRent #Readymovein 🏡✨ · ផ្ទះល្វែងកូនកាត់ LC2​ សម្រាប់ជួល |​Link House (LC2) for Rent | Borey Peng Huoth Beoung Snor - Mercurean 2 · 💰តម្លៃជួល | Rental Price: $ 500/month (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 5.3m x 14.7m（土地面积）"
  },
  {
    "id": "penghuothproperty_2086",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "\udcb0  តម្លៃជួល| Rental Price: $ 2,500/month  (ចរចារ/Negotiation) 租金可协商",
    "price": 2500,
    "priceFormatted": "$2,500/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2086",
    "snippet": "#CommercialShophouse #ForRent 🏡✨ផ្ទះអាជីវកម្មកែងនៅលើផ្លូវធំ សម្រាប់ជួល | Corner Main Road Shophouse for Rent | Borey Peng Huoth Beoung Snor - POLARIS 1 · 💰  តម្លៃជួល| Rental Price: $ 2,500/month  (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 8.5m x 20m（土地面积） · 🏠 ទំហំផ្ទះ | House Size: 4.5m x 14m（别墅面积）"
  },
  {
    "id": "penghuothproperty_2082",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះអាជីវកម្មប្រភេទ​ D  មានគ្រឿងសង្ហារឹមស្រាប់ ​សម្រាប់លក់ឬ ជួល | Fully Furnished Shophouse (SH-D) for Sale/Rent | Borey Peng Huoth Beoung Snor - ECO SUNRISE",
    "price": 140000,
    "priceFormatted": "$140,000/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2082",
    "snippet": "#ForSale #ForRent 🏡✨ · ផ្ទះអាជីវកម្មប្រភេទ​ D  មានគ្រឿងសង្ហារឹមស្រាប់ ​សម្រាប់លក់ឬ ជួល | Fully Furnished Shophouse (SH-D) for Sale/Rent | Borey Peng Huoth Beoung Snor - ECO SUNRISE · 💰 តម្លៃលក់ | Sale Price: $ 140,000 (តម្លៃថេរ/Fixed Price) 价格可协商 · 💰 តម្លៃជួល| Rental Price: $ 550/month (ចរចារ/Negotiation) 租金可协商"
  },
  {
    "id": "NickREAKH_2834",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 98000,
    "priceFormatted": "$98,000 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2834",
    "snippet": "#ForSale $98,000 | 𝗨𝗥𝗚𝗘𝗡𝗧 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 BKK1, Phnom Penh · ――――――――――"
  },
  {
    "id": "penghuothproperty_2076",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាភ្លោះ សម្រាប់ជួល​| Twin Villa for Rent | Borey Peng Huoth Beoung Snor - EURO VILLE",
    "price": 1400,
    "priceFormatted": "$1,400/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2076",
    "snippet": "#ForRent #readytomovein 🏡✨ · វីឡាភ្លោះ សម្រាប់ជួល​| Twin Villa for Rent | Borey Peng Huoth Beoung Snor - EURO VILLE · 💰 តម្លៃជួល| Rental Price: $1,400/month (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 8.5m x 22m（土地面积）"
  },
  {
    "id": "penghuothproperty_2070",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "\udcb0 តម្លៃលក់ | Sale Price: $145,000 (ចរចារ/Negotiation) 价格可协商",
    "price": 145000,
    "priceFormatted": "$145,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2070",
    "snippet": "#ForSale #Commercialshophouse🏡✨ផ្ទះអាជីវកម្មប្រភេទ D សម្រាប់លក់ | Shophouse (SH-D) for Sale | Borey PH Beoung Snor Polaris II | 炳发城店屋出售 · 💰 តម្លៃលក់ | Sale Price: $145,000 (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 4.2m x 17m（土地面积） · 🏠 ទំហំផ្ទះ | House Size: 4.2m x 10m（别墅面积）"
  },
  {
    "id": "penghuothproperty_2064",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "វីឡាភ្លោះសម្រាប់លក់ | Twin Villa for Sale | Borey Peng Huoth Beoung Snor - Euro Ville",
    "price": 330000,
    "priceFormatted": "$330,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2064",
    "snippet": "#ForSale #Newlylisting 🏡✨ · វីឡាភ្លោះសម្រាប់លក់ | Twin Villa for Sale | Borey Peng Huoth Beoung Snor - Euro Ville · 💰 តម្លៃលក់ | Sale Price: $330,000 (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 8.5m x 22m（土地面积）"
  },
  {
    "id": "penghuothproperty_2057",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "បន្ទប់ខុនដូរ​ គ្រែពីរ​ សម្រាប់ជួល| 2-Bedroom Condo for Rent | The Star Polaris 23 Condominium  炳发城公寓出租",
    "price": 450,
    "priceFormatted": "$450/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2057",
    "snippet": "#ForRent #NewAvailableUnit #readymovein 🏡✨ · បន្ទប់ខុនដូរ​ គ្រែពីរ​ សម្រាប់ជួល| 2-Bedroom Condo for Rent | The Star Polaris 23 Condominium  炳发城公寓出租 · 💰 តម្លៃជួល| Rental Price: $450 (ចរចារ/Negotiation)租金可协商 · 📐 ទំហំបន្ទប់ | Unit Size: 60sqm（面积）"
  },
  {
    "id": "penghuothproperty_2051",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះវីឡាកូនកាត់ LA​ សម្រាប់ជួល |​Link Villa (LA) for Rent | Borey PH Beoung Snor - Eco Delta",
    "price": 950,
    "priceFormatted": "$950/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2051",
    "snippet": "#ForRent #Readymovein 🏡✨ · ផ្ទះវីឡាកូនកាត់ LA​ សម្រាប់ជួល |​Link Villa (LA) for Rent | Borey PH Beoung Snor - Eco Delta · 💰តម្លៃជួល | Rental Price: $ 950/month (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 5m x 20m（土地面积）"
  },
  {
    "id": "penghuothproperty_2044",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "\udcb0  តម្លៃជួល| Rental Price: $ 1,350/month  (ចរចារ/Negotiation) 租金可协商",
    "price": 1350,
    "priceFormatted": "$1,350/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2044",
    "snippet": "#CommercialShophouse #ForRent 🏡✨ផ្ទះអាជីវកម្មនៅលើផ្លូវធំ សម្រាប់ជួល | Main Road Shophouse for Rent | Borey Peng Huoth Beoung Snor - POLARIS 1 · 💰  តម្លៃជួល| Rental Price: $ 1,350/month  (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 7.5m x 21m（土地面积） · 🏠 ទំហំផ្ទះ | House Size: 5m x 16m（别墅面积）"
  },
  {
    "id": "NickREAKH_2832",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟳 | 𝗡𝗘𝗪 𝗟𝗔𝗬𝗢𝗨𝗧",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2832",
    "snippet": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟳 | 𝗡𝗘𝗪 𝗟𝗔𝗬𝗢𝗨𝗧 · 📍 Toul Kork, Phnom Penh · 𝗣𝗥𝗢𝗠𝗢𝗧𝗜𝗢𝗡 · 🔥 Type A1 & A2 — 13% OFF"
  },
  {
    "id": "NickREAKH_2830",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟳 | 𝗡𝗘𝗪 𝗟𝗔𝗬𝗢𝗨𝗧",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2830",
    "snippet": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟳 | 𝗡𝗘𝗪 𝗟𝗔𝗬𝗢𝗨𝗧 · 📍 Toul Kork, Phnom Penh · 𝗣𝗥𝗢𝗠𝗢𝗧𝗜𝗢𝗡 · ✅ 1 Bedroom Duplex"
  },
  {
    "id": "NickREAKH_2823",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗩𝗨𝗘 𝗔𝗦𝗧𝗢𝗡 | 𝟮𝗕𝗥 𝗥𝗜𝗩𝗘𝗥 𝗩𝗜𝗘𝗪",
    "price": 80000,
    "priceFormatted": "$80,000 USD",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/NickREAKH/2823",
    "snippet": "#ForSale $80,000 | 𝗨𝗥𝗚𝗘𝗡𝗧 · 𝗩𝗨𝗘 𝗔𝗦𝗧𝗢𝗡 | 𝟮𝗕𝗥 𝗥𝗜𝗩𝗘𝗥 𝗩𝗜𝗘𝗪 · 📍 Koh Norea · ――――――――――"
  },
  {
    "id": "NickREAKH_2822",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗠𝗢𝗥𝗚𝗔𝗡 𝗘𝗡𝗠𝗔𝗜𝗦𝗢𝗡 | 𝗦𝗧𝗨𝗗𝗜𝗢",
    "price": 55000,
    "priceFormatted": "$55,000 USD",
    "location": "Phnom Penh",
    "beds": "Studio",
    "link": "https://t.me/NickREAKH/2822",
    "snippet": "#ForSale $55,000 · 𝗠𝗢𝗥𝗚𝗔𝗡 𝗘𝗡𝗠𝗔𝗜𝗦𝗢𝗡 | 𝗦𝗧𝗨𝗗𝗜𝗢 · 📍 River View · ――――――――――"
  },
  {
    "id": "NickREAKH_2821",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "15 Reasons to Relocate to Phnom Penh",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2821",
    "snippet": "15 Reasons to Relocate to Phnom Penh · 28 September, 2026 · Thinking about moving to Cambodia? Discover 15 reasons to consider living in Phnom Penh, from affordable living and diverse housing options to healthcare, international services, neighborhoods, regional connectivity and foreign property ownership&#33; · READ MORE:"
  },
  {
    "id": "NickREAKH_2816",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗢𝗥𝗞𝗜𝗗𝗘 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 75000,
    "priceFormatted": "$75,000 USD",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2816",
    "snippet": "#ForSale $75,000 · 𝗢𝗥𝗞𝗜𝗗𝗘 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 St. 2004 · ――――――――――"
  },
  {
    "id": "penghuothproperty_2036",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "វីឡាភ្លោះសម្រាប់លក់ | Twin Villa for Sale | Borey Peng Huoth The Star Diamond (60M) | 炳发城双拼别墅出售（洪森大道）",
    "price": 330000,
    "priceFormatted": "$330,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2036",
    "snippet": "#ForSale 🏡✨ · វីឡាភ្លោះសម្រាប់លក់ | Twin Villa for Sale | Borey Peng Huoth The Star Diamond (60M) | 炳发城双拼别墅出售（洪森大道） · 💰 តម្លៃលក់ | Sale Price: $330,000 (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 8m x 25m（土地面积）"
  },
  {
    "id": "penghuothproperty_2031",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះអាជីវកម្មប្រភេទ C សម្រាប់លក់ | Shophouse (SH-C) for Sale | Borey PH Beoung Snor - Eco Sunrise | 炳发城店屋出售",
    "price": 180000,
    "priceFormatted": "$180,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2031",
    "snippet": "#ForSale #Commercialshophouse🏡✨ · ផ្ទះអាជីវកម្មប្រភេទ C សម្រាប់លក់ | Shophouse (SH-C) for Sale | Borey PH Beoung Snor - Eco Sunrise | 炳发城店屋出售 · 💰 តម្លៃលក់ | Price: $180,000 (Negotiable) 价格可协商 · 📐 ទំហំដី | Land Size: 4.2m x 20m（土地面积）"
  },
  {
    "id": "penghuothproperty_2027",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះល្វែងកូនកាត់ ​ សម្រាប់លក់ |​Link House for Sale| Borey PH Beoung Snor - Eco Romance",
    "price": 188000,
    "priceFormatted": "$188,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2027",
    "snippet": "#ForSale #Readytomovein 🏡✨ · ផ្ទះល្វែងកូនកាត់ ​ សម្រាប់លក់ |​Link House for Sale| Borey PH Beoung Snor - Eco Romance · 💰 តម្លៃលក់ | Sale Price: $ 188,000 (តម្លៃថេរ/Fixed Price) 价格可协商 · 📐 ទំហំដី | Land Size: 5.2m x 15m（土地面积）"
  },
  {
    "id": "penghuothproperty_2021",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះអាជីវកម្មប្រភេទ​ C សម្រាប់ជួល | Shophouse (SH-C) for Rent | Borey PH Beoung Snor - POLARIS 1",
    "price": 950,
    "priceFormatted": "$950/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2021",
    "snippet": "#ForRent #Commercialshophouse · 🏡✨ផ្ទះអាជីវកម្មប្រភេទ​ C សម្រាប់ជួល | Shophouse (SH-C) for Rent | Borey PH Beoung Snor - POLARIS 1 · 💰  តម្លៃជួល| Rental Price: $ 950/month  (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 4.5m x 22m（土地面积）"
  },
  {
    "id": "penghuothproperty_2017",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "\udcb0 តម្លៃលក់ | Sale Price: $ 126,000 (ចរចារ/Negotiation) 价格可协商",
    "price": 126000,
    "priceFormatted": "$126,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2017",
    "snippet": "#ForSale #CommercialShophouse 🏡✨ផ្ទះអាជីវកម្មប្រភេទ​ D សម្រាប់លក់ | Shophouse (SH-D) for Sale | Borey Peng Huoth Beoung Snor - POLARIS 2 · 💰 តម្លៃលក់ | Sale Price: $ 126,000 (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 4.2m x 17m（土地面积） · 🏠 ទំហំផ្ទះ | House Size: 4.2m x 10m（别墅面积）"
  },
  {
    "id": "penghuothproperty_2012",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះវីឡាកូនកាត់ LC2​ សម្រាប់ជួល |​Link House (LC2) for Rent | Borey PH Beoung Snor - Mercurean 1",
    "price": 650,
    "priceFormatted": "$650/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2012",
    "snippet": "#ForRent #Readymovein 🏡✨ · ផ្ទះវីឡាកូនកាត់ LC2​ សម្រាប់ជួល |​Link House (LC2) for Rent | Borey PH Beoung Snor - Mercurean 1 · 💰តម្លៃជួល | Rental Price: $ 650/month (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 5.2m x 15m（土地面积）"
  },
  {
    "id": "penghuothproperty_2006",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាកូនកាត់ LV​ សម្រាប់លក់ ឬជួល |​Link House (LV) for Sale/Rent | Borey PH Beoung Snor - Eco Romance",
    "price": 138000,
    "priceFormatted": "$138,000/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2006",
    "snippet": "#ForSale #ForRent #Readytomovein 🏡✨ · វីឡាកូនកាត់ LV​ សម្រាប់លក់ ឬជួល |​Link House (LV) for Sale/Rent | Borey PH Beoung Snor - Eco Romance · 💰 តម្លៃលក់ | Sale Price: $ 138,000 (ចរចារ/Negotiation) 价格可协商 · 💰 តម្លៃជួល| Rental Price: $ 900 (ចរចារ/Negotiation) 租金可协商"
  },
  {
    "id": "penghuothproperty_2000",
    "type": "Sale",
    "channel": "@penghuothproperty",
    "title": "វីឡាកូនកាត់ LA​ សម្រាប់លក់ |​Link Villa (LA) for Sale | Borey PH Beoung Snor - Mercurean 2",
    "price": 180000,
    "priceFormatted": "$180,000 USD",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/2000",
    "snippet": "#ForSale #Readytomovein 🏡✨ · វីឡាកូនកាត់ LA​ សម្រាប់លក់ |​Link Villa (LA) for Sale | Borey PH Beoung Snor - Mercurean 2 · 💰 តម្លៃលក់ | Sale Price: $ 180,000 (ចរចារ/Negotiation) 价格可协商 · 📐 ទំហំដី | Land Size: 5.1m x 20.5m（土地面积）"
  },
  {
    "id": "penghuothproperty_1996",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "\udcb0  តម្លៃជួល| Rental Price: $ 750/month  (ចរចារ/Negotiation) 租金可协商",
    "price": 750,
    "priceFormatted": "$750/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/1996",
    "snippet": "#ForRent #CommercialShophouse 🏡✨ផ្ទះអាជីវកម្មប្រភេទ​ D សម្រាប់ជួល | Shophouse (SH-D) for Rent | Borey Peng Huoth Beoung Snor - POLARIS 2 · 💰  តម្លៃជួល| Rental Price: $ 750/month  (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 4.2m x 17m（土地面积） · 🏠 ទំហំផ្ទះ | House Size: 4.2m x 10m（别墅面积）"
  },
  {
    "id": "penghuothproperty_1991",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាទោល សម្រាប់ជួល​| Single Villa for Rent | Borey PH Beoung Snor - The Star Platinum (Project 1)",
    "price": 4500,
    "priceFormatted": "$4,500/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/1991",
    "snippet": "#ForRent #Readytomovein​ 🏡✨ · វីឡាទោល សម្រាប់ជួល​| Single Villa for Rent | Borey PH Beoung Snor - The Star Platinum (Project 1) · 💰 តម្លៃជួល| Rental Price: $4,500/month (ចរចារ/Negotiation) · 📐 ទំហំដី | Land Size: 17m x 24m（土地面积）"
  },
  {
    "id": "NickREAKH_2808",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟰𝗕𝗥 𝗗𝗨𝗣𝗟𝗘𝗫 𝗞𝗜𝗡𝗚",
    "price": 390000,
    "priceFormatted": "$390,000 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2808",
    "snippet": "#ForSale $390,000 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟰𝗕𝗥 𝗗𝗨𝗣𝗟𝗘𝗫 𝗞𝗜𝗡𝗚 · 📍 BKK1 · 𝗨𝗡𝗜𝗧 𝗗𝗘𝗧𝗔𝗜𝗟𝗦"
  },
  {
    "id": "penghuothproperty_1984",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "ផ្ទះអាជីវកម្មប្រភេទ​ D សម្រាប់ជួល | Shophouse (SH-D) for Rent | Borey PH Beoung Snor - Eco Sunrise",
    "price": 680,
    "priceFormatted": "$680/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/1984",
    "snippet": "#ForRent #Commercialshophouse · 🏡✨ផ្ទះអាជីវកម្មប្រភេទ​ D សម្រាប់ជួល | Shophouse (SH-D) for Rent | Borey PH Beoung Snor - Eco Sunrise · 💰  តម្លៃជួល| Rental Price: $ 680/month  (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 4.2m x 17m（土地面积）"
  },
  {
    "id": "penghuothproperty_1979",
    "type": "Rent",
    "channel": "@penghuothproperty",
    "title": "វីឡាកូនកាត់ LC1 សម្រាប់ជួល |​ Link Villa LC1 for Rent | Borey Peng Huoth Beoung Snor - Mercurean 1",
    "price": 500,
    "priceFormatted": "$500/mo",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/penghuothproperty/1979",
    "snippet": "#ForRent #Readytomovein 🏡✨ · វីឡាកូនកាត់ LC1 សម្រាប់ជួល |​ Link Villa LC1 for Rent | Borey Peng Huoth Beoung Snor - Mercurean 1 · 💰 តម្លៃជួល| Rental Price: $ 500/month (ចរចារ/Negotiation) 租金可协商 · 📐 ទំហំដី | Land Size: 6.3m x 14.2m（土地面积）"
  },
  {
    "id": "NickREAKH_2807",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🏗️ 𝗝-𝗧𝗢𝗪𝗘𝗥 𝟯 | 𝗖𝗢𝗡𝗦𝗧𝗥𝗨𝗖𝗧𝗜𝗢𝗡 𝗨𝗣𝗗𝗔𝗧𝗘",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2807",
    "snippet": "🏗️ 𝗝-𝗧𝗢𝗪𝗘𝗥 𝟯 | 𝗖𝗢𝗡𝗦𝗧𝗥𝗨𝗖𝗧𝗜𝗢𝗡 𝗨𝗣𝗗𝗔𝗧𝗘 · Construction has reached the 7th floor, with structural and reinforcement works progressing steadily. · At 333m and 77 floors, J-Tower 3 is set to become Cambodia’s tallest condominium."
  },
  {
    "id": "NickREAKH_2806",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "Property Investment in Cambodia With Developer Financing: 3 Projects Offering Long Term Payment Plans",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2806",
    "snippet": "Property Investment in Cambodia With Developer Financing: 3 Projects Offering Long Term Payment Plans · 9 September, 2026 · Property investors in Cambodia do not always need to pay the full purchase price upfront. This guide explores how developer financing and long term payment plans can help investors preserve capital, manage cash flow and potentially use rental income to support repayments. We compare financing options at 3 projects, while explaining what investors should check before choosing a long term property loan&#33; · READ MORE:"
  },
  {
    "id": "NickREAKH_2802",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗟 𝗧𝗢𝗪𝗘𝗥 | 𝗟𝗢𝗙𝗧 𝗖𝗢𝗡𝗗𝗢",
    "price": 54000,
    "priceFormatted": "$54,000 USD",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2802",
    "snippet": "#ForSale $54,000 · 𝗟 𝗧𝗢𝗪𝗘𝗥 | 𝗟𝗢𝗙𝗧 𝗖𝗢𝗡𝗗𝗢 · 📍 Boeung Tumpun · ――――――――――"
  },
  {
    "id": "NickREAKH_2793",
    "type": "Rent",
    "channel": "@NickREAKH",
    "title": "🌆🔑 𝗟𝗨𝗫𝗨𝗥𝗬 𝗣𝗘𝗡𝗧𝗛𝗢𝗨𝗦𝗘𝗦 | 𝗣𝗛𝗡𝗢𝗠 𝗣𝗘𝗡𝗛",
    "price": 3000,
    "priceFormatted": "$3,000/mo",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2793",
    "snippet": "🌆🔑 𝗟𝗨𝗫𝗨𝗥𝗬 𝗣𝗘𝗡𝗧𝗛𝗢𝗨𝗦𝗘𝗦 | 𝗣𝗛𝗡𝗢𝗠 𝗣𝗘𝗡𝗛 · Live at the top with our selection of luxury penthouses FOR RENT from $3,000/month. · ✨ Spacious layouts · ✨ Premium locations"
  },
  {
    "id": "NickREAKH_2786",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟰𝗕𝗥 𝗗𝗨𝗣𝗟𝗘𝗫",
    "price": 395000,
    "priceFormatted": "$395,000 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2786",
    "snippet": "#ForSale – $395,000 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟲 | 𝟰𝗕𝗥 𝗗𝗨𝗣𝗟𝗘𝗫 · 📍 BKK1, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2780",
    "type": "Rent",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟯 | 𝟭𝗕𝗥",
    "price": 68000,
    "priceFormatted": "$68,000/mo",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2780",
    "snippet": "#ForSale – $68,000 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟯 | 𝟭𝗕𝗥 · 📍 Toul Kork, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2779",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🌊 NEW TIME SQUARE PROJECT | SIHANOUKVILLE",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2779",
    "snippet": "🌊 NEW TIME SQUARE PROJECT | SIHANOUKVILLE · Missed the last sold-out Time Square launch? · A brand-new project by an award-winning developer is coming soon to Otres Beach, Sihanoukville. · 🏖️ Resort-style coastal living"
  },
  {
    "id": "NickREAKH_2775",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "Time Square 7 | 1BR DUPLEX",
    "price": 88000,
    "priceFormatted": "$88,000 USD",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2775",
    "snippet": "#UrgentSale $88,000 · Time Square 7 | 1BR DUPLEX · 📍 Toul Kork, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2773",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "📣 TS9 Special Promotion",
    "price": 4000,
    "priceFormatted": "$4,000 USD",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2773",
    "snippet": "📣 TS9 Special Promotion · 🏠 Selected Type H & I Units · ✅ 15% Discount · 🎁 + $4,000 Additional Discount"
  },
  {
    "id": "NickREAKH_2772",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "\udff0✨ 𝗧𝗶𝗺𝗲 𝗖𝗮𝘀𝘁𝗹𝗲 𝗫𝗜 – 𝟮 𝗕𝗲𝗱𝗿𝗼𝗼𝗺 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗣𝗿𝗼𝗺𝗼𝘁𝗶𝗼𝗻&#33;",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "2BR",
    "link": "https://t.me/NickREAKH/2772",
    "snippet": "🏰✨ 𝗧𝗶𝗺𝗲 𝗖𝗮𝘀𝘁𝗹𝗲 𝗫𝗜 – 𝟮 𝗕𝗲𝗱𝗿𝗼𝗼𝗺 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗣𝗿𝗼𝗺𝗼𝘁𝗶𝗼𝗻&#33; · A special offer is now available for selected 2 Bedroom Type A2 units, combining an attractive discount with a furniture package and flexible payment options. 🏡✨ · 🎁 𝗙𝘂𝗿𝗻𝗶𝘁𝘂𝗿𝗲 𝗣𝗮𝗰𝗸𝗮𝗴𝗲: · ✅ Air Conditioner"
  },
  {
    "id": "NickREAKH_2769",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "THE SQUARE 7 | DUPLEX SPECIAL OFFER ✨",
    "price": 194250,
    "priceFormatted": "$194,250 USD",
    "location": "Phnom Penh",
    "beds": "4BR",
    "link": "https://t.me/NickREAKH/2769",
    "snippet": "THE SQUARE 7 | DUPLEX SPECIAL OFFER ✨ · 3 & 4 Bedroom Duplex Units · More space. More privacy. · Perfect for family living or investment."
  },
  {
    "id": "NickREAKH_2768",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🏢 TIME SQUARE 7 | DUPLEX UNIT PROMOTION",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2768",
    "snippet": "🏢 TIME SQUARE 7 | DUPLEX UNIT PROMOTION · Wondering what a Duplex at Time Square 7, Toul Kork will look like when completed? · He is what you can use as benchmark from the completed Time Square 6 showroom. · 📩 Message me for available units, prices, payment plans & current promotions."
  },
  {
    "id": "NickREAKH_2767",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "🏠Borey Peng Huoth | Premium Family Living",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Peng Huoth (Chbar Ampov)",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2767",
    "snippet": "🏠Borey Peng Huoth | Premium Family Living · Gated community with modern homes, lush green parks & world-class facilities. · ✅Secure & prestigious community · ✅Family-friendly lifestyle"
  },
  {
    "id": "NickREAKH_2633",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗠𝗢𝗥𝗚𝗔𝗡 𝗘𝗡𝗠𝗔𝗜𝗦𝗢𝗡 | 𝟮𝗕𝗥 𝗥𝗜𝗩𝗘𝗥 𝗩𝗜𝗘𝗪",
    "price": 109933,
    "priceFormatted": "$109,933 USD",
    "location": "Chroy Changvar",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2633",
    "snippet": "#UrgentSale $109,933 🔥 · 𝗠𝗢𝗥𝗚𝗔𝗡 𝗘𝗡𝗠𝗔𝗜𝗦𝗢𝗡 | 𝟮𝗕𝗥 𝗥𝗜𝗩𝗘𝗥 𝗩𝗜𝗘𝗪 · 📍 Chroy Changvar, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2628",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗠𝗢𝗥𝗚𝗔𝗡 𝗘𝗡𝗠𝗔𝗜𝗦𝗢𝗡 | 𝟮𝗕𝗥 𝗥𝗜𝗩𝗘𝗥 𝗩𝗜𝗘𝗪",
    "price": 80387,
    "priceFormatted": "$80,387 USD",
    "location": "Chroy Changvar",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2628",
    "snippet": "#UrgentSale $80,387 · 𝗠𝗢𝗥𝗚𝗔𝗡 𝗘𝗡𝗠𝗔𝗜𝗦𝗢𝗡 | 𝟮𝗕𝗥 𝗥𝗜𝗩𝗘𝗥 𝗩𝗜𝗘𝗪 · 📍 Chroy Changvar, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2627",
    "type": "Rent",
    "channel": "@NickREAKH",
    "title": "𝗕𝗢𝗥𝗘𝗬 𝗖𝗛𝗔𝗡𝗞𝗜𝗥𝗜 | 𝗖𝗢𝗥𝗡𝗘𝗥 𝗩𝗜𝗟𝗟𝗔",
    "price": 550000,
    "priceFormatted": "$550,000/mo",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2627",
    "snippet": "#ForSale $550,000 · #ForRent $3,000/month · 𝗕𝗢𝗥𝗘𝗬 𝗖𝗛𝗔𝗡𝗞𝗜𝗥𝗜 | 𝗖𝗢𝗥𝗡𝗘𝗥 𝗩𝗜𝗟𝗟𝗔 · 📍 National Road No.2"
  },
  {
    "id": "NickREAKH_2626",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "⚡️⚡️ Your Biggest Property Opportunity of the Year is Here&#33;",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2626",
    "snippet": "⚡️⚡️ Your Biggest Property Opportunity of the Year is Here&#33; · We are excited to launch the Cambodia Property Flash Sale 2026 promotion — bringing you exclusive access to real estate deals, available for a limited time only. · Why Buy Now? · ✅ Exclusive Deals: Access special offers available only during this campaign."
  },
  {
    "id": "NickREAKH_2625",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗔𝗡𝗔𝗧𝗔 𝗥𝗘𝗦𝗜𝗗𝗘𝗡𝗖𝗘 | 𝗦𝗧𝗨𝗗𝗜𝗢 𝗨𝗡𝗜𝗧",
    "price": 45308,
    "priceFormatted": "$45,308 USD",
    "location": "Phnom Penh",
    "beds": "Studio",
    "link": "https://t.me/NickREAKH/2625",
    "snippet": "#SpecialPromotion $45,308.67 · 𝗔𝗡𝗔𝗧𝗔 𝗥𝗘𝗦𝗜𝗗𝗘𝗡𝗖𝗘 | 𝗦𝗧𝗨𝗗𝗜𝗢 𝗨𝗡𝗜𝗧 · 📍 Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2622",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟭𝟬 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 65000,
    "priceFormatted": "$65,000 USD",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2622",
    "snippet": "#ForSale $65,000 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟭𝟬 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 Sihanoukville, Beachfront 🏖️ · ――――――――――"
  },
  {
    "id": "NickREAKH_2615",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗖𝗛𝗜𝗣 𝗠𝗢𝗡𝗚 𝗣𝗔𝗥𝗞𝗟𝗔𝗡𝗗 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 47000,
    "priceFormatted": "$47,000 USD",
    "location": "Toul Kork",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2615",
    "snippet": "#ForSale $47,000 · 𝗖𝗛𝗜𝗣 𝗠𝗢𝗡𝗚 𝗣𝗔𝗥𝗞𝗟𝗔𝗡𝗗 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 Toul Kork, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2605",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗝 𝗧𝗢𝗪𝗘𝗥 𝟮 | 𝟮𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 178000,
    "priceFormatted": "$178,000 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2605",
    "snippet": "#ForSale $178,000 · 𝗝 𝗧𝗢𝗪𝗘𝗥 𝟮 | 𝟮𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 BKK1, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2602",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "\udfd7️ TIME SQUARE 6 Update ✨",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2602",
    "snippet": "🏗️ TIME SQUARE 6 Update ✨ · The facade is looking fantastic, just like the original render&#33; ✨ · 1 year till completion. · We have multiple resale units available with different layouts and price ranges."
  },
  {
    "id": "NickREAKH_2595",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗟 𝗧𝗢𝗪𝗘𝗥 𝟮𝟳𝟭 | 𝗟𝗢𝗙𝗧 𝟭𝗕𝗥",
    "price": 58000,
    "priceFormatted": "$58,000 USD",
    "location": "Chamkarmon",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2595",
    "snippet": "#ForSale $58,000 · 𝗟 𝗧𝗢𝗪𝗘𝗥 𝟮𝟳𝟭 | 𝗟𝗢𝗙𝗧 𝟭𝗕𝗥 · 📍 Boeung Tumpun, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2588",
    "type": "Rent",
    "channel": "@NickREAKH",
    "title": "𝗗𝗘 𝗖𝗔𝗦𝗧𝗟𝗘 𝗥𝗢𝗬𝗔𝗟 | 𝟯𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 398000,
    "priceFormatted": "$398,000/mo",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2588",
    "snippet": "#ForSale $398,000 · #ForRent $1,800/month · 𝗗𝗘 𝗖𝗔𝗦𝗧𝗟𝗘 𝗥𝗢𝗬𝗔𝗟 | 𝟯𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 BKK1, Phnom Penh"
  },
  {
    "id": "NickREAKH_2581",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟱 | 𝟮𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 139000,
    "priceFormatted": "$139,000 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2581",
    "snippet": "#UrgentSale $139,000 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟱 | 𝟮𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 BKK1, Phnom Penh · ――――――――――"
  },
  {
    "id": "NickREAKH_2577",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "\udfd7️ TIME SQUARE 6 Update ✨",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2577",
    "snippet": "🏗️ TIME SQUARE 6 Update ✨ · The facade is looking fantastic, just like the original render&#33; ✨ · ⏳Only around 1 year to completion. · Looking for a project with a fast move-in timeline? Time Square 6 is definitely worth considering."
  },
  {
    "id": "NickREAKH_2576",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "Why Smart Property Investors Are Prioritising Rental Yields Over Capital Appreciation in Cambodia",
    "price": null,
    "priceFormatted": "Inquire",
    "location": "Phnom Penh",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2576",
    "snippet": "Why Smart Property Investors Are Prioritising Rental Yields Over Capital Appreciation in Cambodia · 6 August, 2026 · As global property markets shift towards income-focused investing, rental yield has become a key metric for experienced buyers. This article explores why Cambodia, particularly Phnom Penh, is attracting investors with gross rental yields of 6% to 9%, affordable property prices, and strong tenant demand. It also highlights the capital&#39;s top-performing rental districts helping investors understand where sustainable cash flow opportunities can be found. · READ MORE:"
  },
  {
    "id": "NickREAKH_2569",
    "type": "Sale",
    "channel": "@NickREAKH",
    "title": "𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟯𝟬𝟮 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧",
    "price": 105600,
    "priceFormatted": "$105,600 USD",
    "location": "BKK1",
    "beds": "1BR",
    "link": "https://t.me/NickREAKH/2569",
    "snippet": "#ForSale $105,600 · 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟯𝟬𝟮 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧 · 📍 BKK1 · ――――――――――"
  }
];

function getBotToken() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty("BOT_TOKEN") || DEFAULT_BOT_TOKEN;
}

function getNickChatId() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty("NICK_CHAT_ID") || DEFAULT_NICK_CHAT_ID;
}

// ── 1. INSTALL / UNINSTALL 1-MINUTE CLOUD TRIGGER ────────────
function installSearchBotTrigger() {
  uninstallSearchBotTrigger();
  ScriptApp.newTrigger("checkForSearchBotUpdates")
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log("✅ 1-minute 24/7 Google Cloud Trigger successfully installed!");
}

function uninstallSearchBotTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkForSearchBotUpdates") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  Logger.log("🛑 Old triggers cleaned up.");
}

// ── 2. MAIN 24/7 POLLING ENGINE ──────────────────────────────
function checkForSearchBotUpdates() {
  const token = getBotToken();
  const props = PropertiesService.getScriptProperties();
  const lastUpdateId = parseInt(props.getProperty("LAST_UPDATE_ID") || "0", 10);

  const url = "https://api.telegram.org/bot" + token + "/getUpdates?offset=" + (lastUpdateId + 1) + "&timeout=5";
  
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(res.getContentText());
    if (!data.ok || !data.result || data.result.length === 0) return;

    let maxId = lastUpdateId;
    for (let i = 0; i < data.result.length; i++) {
      const update = data.result[i];
      if (update.update_id > maxId) maxId = update.update_id;
      handleTelegramUpdate(update);
    }
    props.setProperty("LAST_UPDATE_ID", maxId.toString());
  } catch (err) {
    Logger.log("Polling Error: " + err.toString());
  }
}

// ── 3. UPDATE ROUTER ──────────────────────────────────────────
function handleTelegramUpdate(update) {
  if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
  } else if (update.message) {
    handleIncomingMessage(update.message);
  }
}

// ── 4. MESSAGE HANDLER ────────────────────────────────────────
function handleIncomingMessage(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || "").trim();
  const user = msg.from || {};

  if (!text) return;

  if (text.startsWith("/start") || text.startsWith("/menu") || text.startsWith("/search") || text.startsWith("/explore")) {
    sendStep1(chatId);
    return;
  }

  if (text.startsWith("/rent")) {
    sendStep2(chatId, "Rent");
    return;
  }

  if (text.startsWith("/sale") || text.startsWith("/buy")) {
    sendStep2(chatId, "Sale");
    return;
  }

  if (text.startsWith("/nick") || text.startsWith("/contact")) {
    sendContactNick(chatId);
    return;
  }

  handleNaturalSearch(chatId, user, text);
}

// ── 5. 5-STEP SEARCH CONCIERGE FLOW ───────────────────────────

function sendStep1(chatId) {
  const text = 
    "🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "<b>Step 1 of 5 · Target Objective</b>\n\n" +
    "Are you looking to purchase or rent a property in Phnom Penh?";

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🏢 Buy a Property", callback_data: "srch_step1_sale" },
        { text: "🔑 Rent a Home", callback_data: "srch_step1_rent" }
      ]
    ]
  };

  sendTelegramMessage(chatId, text, keyboard);
}

function sendStep2(chatId, type) {
  const isRent = type === "Rent";
  setUserState(chatId, { type: type });

  const text = 
    "🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "<b>Step 2 of 5 · Property Category (" + (isRent ? "Rent" : "Buy") + ")</b>\n\n" +
    "Which property category best fits your lifestyle?";

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🏢 Modern Condo", callback_data: "srch_step2_condo" },
        { text: "🛋️ Serviced Apt", callback_data: "srch_step2_apt" }
      ],
      [
        { text: "🏡 Villa / Borey", callback_data: "srch_step2_villa" },
        { text: "🌐 Any Category", callback_data: "srch_step2_any" }
      ],
      [
        { text: "🔙 Back to Step 1", callback_data: "srch_step0_start" }
      ]
    ]
  };

  sendTelegramMessage(chatId, text, keyboard);
}

function sendStep3(chatId) {
  const text = 
    "🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "<b>Step 3 of 5 · Target Location</b>\n\n" +
    "Select your preferred residential or investment district:";

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📍 BKK1", callback_data: "srch_step3_bkk1" },
        { text: "📍 Tonle Bassac", callback_data: "srch_step3_tb" }
      ],
      [
        { text: "📍 Chamkarmon (TTP)", callback_data: "srch_step3_ttp" },
        { text: "📍 Toul Kork", callback_data: "srch_step3_tk" }
      ],
      [
        { text: "🏡 Peng Huoth / Chbar Ampov", callback_data: "srch_step3_ph" }
      ],
      [
        { text: "🌐 Any Location", callback_data: "srch_step3_any" },
        { text: "🔙 Back", callback_data: "srch_back_to_step2" }
      ]
    ]
  };

  sendTelegramMessage(chatId, text, keyboard);
}

function sendStep4(chatId) {
  const state = getUserState(chatId);
  const isRent = state.type === "Rent";

  let text = "";
  let keyboard = {};

  if (isRent) {
    text = 
      "🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "<b>Step 4 of 5 · Monthly Rental Budget</b>\n\n" +
      "Select your target monthly budget range:";

    keyboard = {
      inline_keyboard: [
        [
          { text: "💵 Under $500 / mo", callback_data: "srch_step4_rent_b1" },
          { text: "💵 $500 – $800 / mo", callback_data: "srch_step4_rent_b2" }
        ],
        [
          { text: "💵 $800 – $1,500 / mo", callback_data: "srch_step4_rent_b3" },
          { text: "💵 $1,500+ / mo", callback_data: "srch_step4_rent_b4" }
        ],
        [
          { text: "🔙 Back to Location", callback_data: "srch_back_to_step3" }
        ]
      ]
    };
  } else {
    text = 
      "🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "<b>Step 4 of 5 · Target Acquisition Budget</b>\n\n" +
      "Select your target investment budget range:";

    keyboard = {
      inline_keyboard: [
        [
          { text: "💰 Under $70,000 USD", callback_data: "srch_step4_sale_b1" },
          { text: "💰 $70k – $120,000 USD", callback_data: "srch_step4_sale_b2" }
        ],
        [
          { text: "💰 $120k – $250,000 USD", callback_data: "srch_step4_sale_b3" },
          { text: "💰 $250,000+ USD", callback_data: "srch_step4_sale_b4" }
        ],
        [
          { text: "🔙 Back to Location", callback_data: "srch_back_to_step3" }
        ]
      ]
    };
  }

  sendTelegramMessage(chatId, text, keyboard);
}

function sendStep5(chatId) {
  const state = getUserState(chatId);
  const isRent = state.type === "Rent";

  let text = "";
  let keyboard = {};

  if (isRent) {
    text = 
      "🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "<b>Step 5 of 5 · Primary Living Priority</b>\n\n" +
      "What is your main requirement for this rental?";

    keyboard = {
      inline_keyboard: [
        [{ text: "💼 Work & Walkability to CBD", callback_data: "srch_step5_rent_work" }],
        [{ text: "🏊 Full Facilities (Pool & Sky Gym)", callback_data: "srch_step5_rent_amen" }],
        [{ text: "🧹 Serviced (Cleaning & Bills Included)", callback_data: "srch_step5_rent_serv" }],
        [{ text: "🔙 Back to Budget", callback_data: "srch_back_to_step4" }]
      ]
    };
  } else {
    text = 
      "🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "<b>Step 5 of 5 · Investment Objective</b>\n\n" +
      "What is your primary investment goal?";

    keyboard = {
      inline_keyboard: [
        [{ text: "📈 High Rental Yield (8%+ Net ROI)", callback_data: "srch_step5_sale_yield" }],
        [{ text: "🚀 Capital Appreciation & Prime Growth", callback_data: "srch_step5_sale_growth" }],
        [{ text: "🏡 Personal Residence / Expat Living", callback_data: "srch_step5_sale_home" }],
        [{ text: "🔙 Back to Budget", callback_data: "srch_back_to_step4" }]
      ]
    };
  }

  sendTelegramMessage(chatId, text, keyboard);
}

// ── 6. DYNAMIC MATCHING & RESULTS CARD ─────────────────────────

function sendResults(chatId, page) {
  const state = getUserState(chatId);
  const isRent = state.type === "Rent";
  const allMatches = filterMatches(state);
  const pageSize = 3;
  const startIndex = (page - 1) * pageSize;
  const displayed = allMatches.slice(startIndex, startIndex + pageSize);
  const totalCount = allMatches.length;

  const summary = (state.type || "Search") + " · " + (state.propTypeLabel || "Condo") + " · " + (state.locLabel || "Phnom Penh") + " · " + (state.budgetLabel || "Profile");

  let text = 
    "⚖️ <b>PHC HANDPICKED " + (isRent ? "RENTAL" : "INVESTMENT") + " MATCHES</b>\n" +
    "<i>Filtered by: " + summary + " (" + totalCount + " verified units)</i>\n\n";

  const buttonsRow = [];

  if (displayed.length === 0) {
    text += "<blockquote>No direct matches found in our current catalog for this exact combination. Nick is searching offline off-market options for you now:</blockquote>";
  } else {
    for (let i = 0; i < displayed.length; i++) {
      const m = displayed[i];
      const num = startIndex + i + 1;
      let cleanTitle = (m.title || (m.location + " " + m.beds))
        .replace(/^#Newlisting\s*/i, "")
        .replace(/^[📍🏢✨🍃💫🏡\s]+/, "")
        .replace(/\s*·\s*Features:[\s\S]*/i, "")
        .split("·")[0].trim();

      const snippet = m.snippet || "";
      const floorM = snippet.match(/(\d+(?:st|nd|rd|th)(?:\s*floor)?)/i);
      const floor = floorM ? floorM[1] : "";

      const sizeM = snippet.match(/(\d+(?:\.\d+)?\s*(?:m²|sqm))/i);
      const size = sizeM ? sizeM[1].replace(/m²/i, "m²") : "";

      const bedBathM = snippet.match(/(\d+\s*🛏\s*\|\s*\d+\s*🛁|\d+\s*🛏)/i);
      let layout = bedBathM ? bedBathM[1].replace(/\|/g, "·").replace(/\s+/g, " ").trim() : m.beds;
      if (!layout.includes("🛏") && m.beds) layout = m.beds + " (1🛁)";

      const specsLine = [floor, size, layout].filter(Boolean).join(" | ");

      const priceClean = (m.priceFormatted && !m.priceFormatted.startsWith("/mo") && m.priceFormatted !== "Inquire")
        ? m.priceFormatted
        : (m.price ? (isRent ? ("$" + m.price.toLocaleString() + "/mo") : ("$" + m.price.toLocaleString() + " USD")) : "Inquire");

      let yieldLine = "";
      if (!isRent && m.price) {
        const estRent = Math.round(m.price * 0.0075);
        const netYield = ((estRent * 12 * 0.88) / m.price * 100).toFixed(1);
        yieldLine = "▫️ <b>Est. Net Yield:</b> ~" + netYield + "% Net\n";
      }

      text += 
        "<blockquote>✨ <b>OPTION " + num + "</b>\n" +
        "▫️ <b>Property:</b> " + cleanTitle + "\n" +
        "▫️ <b>Pricing:</b> " + priceClean + "\n" +
        "▫️ <b>Specs:</b> " + m.beds + "\n" +
        "📍 <i>" + m.location + "</i>\n" +
        (specsLine ? (specsLine + "\n") : "") +
        yieldLine +
        "▫️ <b>Listing Photos:</b> <a href=\"" + m.link + "\">View Details ↗</a></blockquote>\n\n";

      buttonsRow.push({ text: "✨ Option " + num + " ↗", url: m.link });
    }
  }

  text += "💡 <i>Tap any option button below to inspect verified photos and channel post details.</i>";

  const keyboard = [];
  if (buttonsRow.length > 0) {
    keyboard.push(buttonsRow);
  }

  const hasNext = startIndex + pageSize < totalCount;
  const hasPrev = page > 1;
  const navRow = [];
  if (hasPrev) {
    navRow.push({ text: "🔙 Previous 3", callback_data: "srch_page_" + (page - 1) });
  }
  if (hasNext) {
    navRow.push({ text: "📂 View Next 3 Matches ❯", callback_data: "srch_page_" + (page + 1) });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  keyboard.push([
    { text: "🎯 Request Custom Sourcing from Nick", callback_data: "custom_source" },
    { text: "💬 Chat with Nick Directly ↗", url: "https://t.me/Nick_REAKH" }
  ]);
  keyboard.push([
    { text: "🔄 Start New Search", callback_data: "srch_step0_start" }
  ]);

  sendTelegramMessage(chatId, text, { inline_keyboard: keyboard });
}

function filterMatches(state) {
  const isRent = state.type === "Rent";
  let matches = VERIFIED_INVENTORY.filter(function(l) {
    return l.type.toLowerCase() === state.type.toLowerCase();
  });

  if (state.location && state.location !== "any") {
    const locMap = {
      bkk1: ["bkk1", "bkk 1", "boeung keng kang 1", "bkk"],
      tb: ["tonle bassac", "bassac", "aeon"],
      ttp: ["chamkarmon", "toul tompoung", "russian market", "ttp", "tumpun"],
      tk: ["toul kork", "boeng kak", "sen sok"],
      ph: ["peng huoth", "beoung snor", "boeung snor", "chbar ampov", "national road 1"]
    };
    const keywords = locMap[state.location] || [state.location];
    const locFiltered = matches.filter(function(l) {
      const text = (l.location + " " + l.title + " " + l.snippet).toLowerCase();
      return keywords.some(function(k) { return text.indexOf(k) !== -1; });
    });
    if (locFiltered.length > 0) matches = locFiltered;
  }

  if (state.budget) {
    let minP = 0;
    let maxP = 99999999;
    if (isRent) {
      if (state.budget === "rent_b1") { minP = 0; maxP = 500; }
      else if (state.budget === "rent_b2") { minP = 450; maxP = 850; }
      else if (state.budget === "rent_b3") { minP = 750; maxP = 1600; }
      else if (state.budget === "rent_b4") { minP = 1400; maxP = 15000; }
    } else {
      if (state.budget === "sale_b1") { minP = 0; maxP = 75000; }
      else if (state.budget === "sale_b2") { minP = 65000; maxP = 130000; }
      else if (state.budget === "sale_b3") { minP = 120000; maxP = 270000; }
      else if (state.budget === "sale_b4") { minP = 240000; maxP = 2000000; }
    }
    const bgFiltered = matches.filter(function(l) {
      return !l.price || (l.price >= minP && l.price <= maxP);
    });
    if (bgFiltered.length > 0) matches = bgFiltered;
  }

  if (state.propType && state.propType !== "any") {
    if (state.propType === "apt") {
      const apt = matches.filter(function(l) { return /serviced|apartment|អាផាតមិន/i.test(l.title + " " + l.snippet); });
      if (apt.length > 0) matches = apt;
    } else if (state.propType === "villa") {
      const vil = matches.filter(function(l) { return /villa|borey|វីឡា|link house|shophouse/i.test(l.title + " " + l.snippet); });
      if (vil.length > 0) matches = vil;
    } else if (state.propType === "condo") {
      const cnd = matches.filter(function(l) { return /condo|time square|tower|residence|ខុនដូ/i.test(l.title + " " + l.snippet); });
      if (cnd.length > 0) matches = cnd;
    }
  }

  return matches;
}

// ── 7. CALLBACK QUERY HANDLER ────────────────────────────────
function handleCallbackQuery(cb) {
  const chatId = cb.message.chat.id.toString();
  const data = cb.data || "";

  answerCallback(cb.id);

  if (data === "srch_step0_start") {
    sendStep1(chatId);
  } else if (data === "srch_step1_sale") {
    sendStep2(chatId, "Sale");
  } else if (data === "srch_step1_rent") {
    sendStep2(chatId, "Rent");
  } else if (data.indexOf("srch_step2_") === 0) {
    const pType = data.replace("srch_step2_", "");
    const state = getUserState(chatId);
    state.propType = pType;
    const pNames = { condo: "Modern Condo", apt: "Serviced Apartment", villa: "Villa / Borey", any: "Any Type" };
    state.propTypeLabel = pNames[pType] || "All Types";
    setUserState(chatId, state);
    sendStep3(chatId);
  } else if (data === "srch_back_to_step2") {
    const state = getUserState(chatId);
    sendStep2(chatId, state.type || "Sale");
  } else if (data.indexOf("srch_step3_") === 0) {
    const loc = data.replace("srch_step3_", "");
    const state = getUserState(chatId);
    state.location = loc;
    const locNames = { bkk1: "BKK1", tb: "Tonle Bassac", ttp: "Chamkarmon / TTP", tk: "Toul Kork", ph: "Peng Huoth / Chbar Ampov", any: "Any Prime District" };
    state.locLabel = locNames[loc] || "Phnom Penh";
    setUserState(chatId, state);
    sendStep4(chatId);
  } else if (data === "srch_back_to_step3") {
    sendStep3(chatId);
  } else if (data.indexOf("srch_step4_") === 0) {
    const bgKey = data.replace("srch_step4_", "");
    const state = getUserState(chatId);
    state.budget = bgKey;
    const bgLabels = {
      rent_b1: "Under $500/mo", rent_b2: "$500–$800/mo", rent_b3: "$800–$1,500/mo", rent_b4: "$1,500+/mo",
      sale_b1: "Under $70k USD", sale_b2: "$70k–$120k USD", sale_b3: "$120k–$250k USD", sale_b4: "$250k+ USD"
    };
    state.budgetLabel = bgLabels[bgKey] || "Budget Profile";
    setUserState(chatId, state);
    sendStep5(chatId);
  } else if (data === "srch_back_to_step4") {
    sendStep4(chatId);
  } else if (data.indexOf("srch_step5_") === 0) {
    const pur = data.replace("srch_step5_", "");
    const state = getUserState(chatId);
    state.purpose = pur;
    setUserState(chatId, state);
    sendResults(chatId, 1);
  } else if (data.indexOf("srch_page_") === 0) {
    const pg = parseInt(data.replace("srch_page_", ""), 10) || 1;
    sendResults(chatId, pg);
  } else if (data === "custom_source") {
    promptCustomSourcing(chatId);
  }
}

// ── 8. USER STATE HELPERS (PropertiesService) ─────────────────
function getUserState(chatId) {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty("STATE_" + chatId);
  if (!raw) return { type: "Sale" };
  try { return JSON.parse(raw); } catch (e) { return { type: "Sale" }; }
}

function setUserState(chatId, state) {
  const props = PropertiesService.getUserProperties();
  props.setProperty("STATE_" + chatId, JSON.stringify(state));
}

// ── 9. NATURAL LANGUAGE & BESPOKE SOURCING ────────────────────
function handleNaturalSearch(chatId, user, text) {
  const lower = text.toLowerCase();
  const isRent = lower.indexOf("rent") !== -1 || lower.indexOf("/mo") !== -1 || lower.indexOf("month") !== -1;
  const isPH = lower.indexOf("peng huoth") !== -1 || lower.indexOf("borey") !== -1 || lower.indexOf("villa") !== -1;
  const state = {
    type: isRent ? "Rent" : "Sale",
    location: isPH ? "ph" : (lower.indexOf("bkk") !== -1 ? "bkk1" : (lower.indexOf("bassac") !== -1 ? "tb" : "any")),
    budget: isRent ? "rent_b2" : "sale_b2",
    propType: isPH ? "villa" : "condo",
    propTypeLabel: isPH ? "Villa / Borey" : "Modern Condo",
    locLabel: isPH ? "Peng Huoth / Chbar Ampov" : (lower.indexOf("bkk") !== -1 ? "BKK1" : "Phnom Penh"),
    budgetLabel: isRent ? "$400–$800/mo" : "Prime Inventory"
  };
  setUserState(chatId, state);
  sendResults(chatId, 1);
  notifyNickOfLead(user, "Natural Language Inquiry", text);
}

function promptCustomSourcing(chatId) {
  const text = 
    "🎯 <b>BESPOKE SOURCING CONCIERGE</b>\n\n" +
    "None of the options quite match what you are looking for?\n\n" +
    "Please reply directly to this chat with your requirements:\n" +
    "▫️ <b>Budget:</b> (e.g. $500/mo or under $100k)\n" +
    "▫️ <b>Preferred Area:</b> (e.g. BKK1, Tonle Bassac, Peng Huoth, Toul Kork)\n" +
    "▫️ <b>Bedrooms:</b> (Studio, 1BR, 2BR, 3BR, 4BR+ Villa)\n" +
    "▫️ <b>Move-in Date / Timeline</b>\n\n" +
    "⚡ Nick will personally review your request within 15 minutes and pull matching offline/unlisted units from our broker database.";

  sendTelegramMessage(chatId, text, null);
}

function sendContactNick(chatId) {
  const text = 
    "👤 <b>DIRECT ADVISORY WITH NICK</b>\n" +
    "<i>Lead Advisor, Realestate.com.kh & Property Hub Cambodia</i>\n\n" +
    "📞 <b>Direct Phone:</b> +855 11 666 952\n" +
    "📱 <b>Telegram Direct:</b> @Nick_REAKH\n" +
    "🏢 <b>Channel:</b> @NickREAKH\n\n" +
    "Feel free to connect directly for off-market inventory or title verification.";

  const keyboard = {
    inline_keyboard: [
      [{ text: "💬 Chat with Nick on Telegram", url: "https://t.me/Nick_REAKH" }],
      [{ text: "🔄 Start Property Search", callback_data: "srch_step0_start" }]
    ]
  };

  sendTelegramMessage(chatId, text, keyboard);
}

function notifyNickOfLead(user, source, content) {
  const nickId = getNickChatId();
  if (!nickId) return;

  const handle = user.username ? "@" + user.username : "No username";
  const name = (user.first_name || "") + " " + (user.last_name || "");

  const text = 
    "🚨 <b>NEW INQUIRY VIA SEARCH BOT</b>\n\n" +
    "👤 <b>Client:</b> " + escapeHtml(name) + " (" + handle + ")\n" +
    "🆔 <b>Telegram ID:</b> <code>" + user.id + "</code>\n" +
    "🏷 <b>Source:</b> " + source + "\n\n" +
    "💬 <b>Message / Requirement:</b>\n<i>" + escapeHtml(content) + "</i>\n\n" +
    "⚡ <i>Please follow up within 15 minutes!</i>";

  sendTelegramMessage(nickId, text, null);
}

// ── 10. TELEGRAM API UTILITIES ────────────────────────────────
function sendTelegramMessage(chatId, text, keyboard) {
  const token = getBotToken();
  const url = "https://api.telegram.org/bot" + token + "/sendMessage";
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };

  if (keyboard) {
    payload.reply_markup = JSON.stringify(keyboard);
  }

  try {
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Send Message Error: " + err.toString());
  }
}

function answerCallback(callbackQueryId) {
  const token = getBotToken();
  const url = "https://api.telegram.org/bot" + token + "/answerCallbackQuery";
  try {
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ callback_query_id: callbackQueryId }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Answer Callback Error: " + err.toString());
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
