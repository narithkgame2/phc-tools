# PHC Website → CRM Bridge

This guide connects the `propertyhubcambodia.lovable.app` inquiry form to
the PHC CRM Google Sheets database so every website inquiry becomes a lead
automatically in the PHC Lead Tracker.

---

## How it works

```
Visitor fills form → submitInquiryToCrm() → Apps Script API → PHC CRM Leads tab → Lead Tracker shows it instantly
```

- Lead ID prefix: `W-` (Website), e.g. `W-1747812345678`
- Source is always set to `"Website"`
- Stage starts at `"New Lead"`, agent defaults to `"N"` (Nick)
- No response is read back (uses `no-cors` — same as all PHC tools)

---

## Step 1 — Add the utility file in Lovable

Open your Lovable project → click the **AI chat** panel → paste this prompt exactly:

---

### LOVABLE PROMPT — copy everything between the lines

```
Create a new file at src/lib/phcCrm.ts with this exact content:

const PHC_API_URL =
  "https://script.google.com/macros/s/AKfycbyCd3r8sX18YONWUf98_eB_B3uuXbn3ALq8A7ataIysQfUPU9y43DvZUe-OoRIticXBzg/exec";

export interface InquiryFormData {
  fullName: string;
  phone: string;       // WhatsApp number
  email?: string;
  budget?: string;     // e.g. "$200K-$300K"
  timeline?: string;   // e.g. "3-6 months"
  interestedIn?: string; // project name
  message?: string;
}

function budgetScore(b = ""): number {
  if (b === "$500K+") return 5;
  if (b === "$300K-$500K") return 4;
  if (b === "$200K-$300K") return 3;
  if (b === "$100K-$200K") return 2;
  return 1;
}

function timelineScore(t = ""): number {
  if (t === "0-3 months") return 5;
  if (t === "3-6 months") return 4;
  if (t === "6-12 months") return 2;
  if (t === "12+ months") return 1;
  return 2;
}

export async function submitInquiryToCrm(data: InquiryFormData): Promise<void> {
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const score = Math.round((2 + budgetScore(data.budget) + timelineScore(data.timeline)) / 3);

  const lead = {
    id: "W-" + Date.now(),
    createdAt: now,
    updatedAt: now,
    fullName: data.fullName.trim(),
    nationality: "Other",
    phone: data.phone.trim(),
    telegram: "",
    email: (data.email ?? "").trim(),
    source: "Website",
    budget: data.budget ?? "",
    timeline: data.timeline ?? "",
    interestedIn: data.interestedIn ?? "",
    stage: "New Lead",
    score,
    agent: "N",
    notes: data.message ? "Website inquiry: " + data.message.trim() : "Website inquiry",
    lastContact: today,
    followUpDate: "",
    followUpAction: "",
    activities: "",
  };

  try {
    await fetch(PHC_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "insert", sheet: "Leads", data: lead }),
      mode: "no-cors",
    });
  } catch {
    // Silent fail — no-cors means we can't read the response anyway
  }
}
```

---

## Step 2 — Wire it into your contact / inquiry form

After Step 1, paste this second prompt into Lovable's AI chat:

---

### LOVABLE PROMPT 2 — wire up the form

```
In the contact / inquiry form component, do the following:

1. Import submitInquiryToCrm and InquiryFormData from "@/lib/phcCrm" (or the correct relative path).

2. Add a loading state: const [submitting, setSubmitting] = useState(false);
   Add a success state: const [submitted, setSubmitted] = useState(false);

3. In the form's onSubmit handler, replace any existing submit logic with:

   setSubmitting(true);
   await submitInquiryToCrm({
     fullName: <name field value>,
     phone: <phone/whatsapp field value>,
     email: <email field value>,          // remove this line if no email field
     budget: <budget dropdown value>,     // remove this line if no budget field
     timeline: <timeline dropdown value>, // remove this line if no timeline field
     interestedIn: <project field value>, // remove this line if no project field
     message: <message/textarea value>,   // remove this line if no message field
   });
   setSubmitting(false);
   setSubmitted(true);

4. Show a success message when submitted === true (e.g. "Thank you! We'll be in touch within 24 hours.").
   Replace the field names above with the actual state variable names already used in your form.
```

---

## Budget & Timeline dropdown values

If your form has a budget or timeline dropdown, use these **exact** string values so the CRM
maps them correctly:

**Budget options:**
```
Under $100K
$100K-$200K
$200K-$300K
$300K-$500K
$500K+
```

**Timeline options:**
```
0-3 months
3-6 months
6-12 months
12+ months
```

**Project options (16 current listings):**
```
Time Square 7
Time Square 8
Time Square 9
Time Square 10
Kingston Royale
Le Conde BKK1
J Tower 3
Odom Tower
Odom Living
UC88 Wyndham Garden
Diamond Bay Garden
Angkor Grace
LZ Sea View Premium
Picasso Sky Gemme
GATO Tower
```

---

## Verifying it works

1. Submit a test inquiry on the live website
2. Open the PHC Lead Tracker → it should appear within seconds as a **New Lead** tagged **Website**
3. Lead ID will start with `W-` so you can spot it easily

---

## What the lead looks like in the CRM

| Field | Value |
|-------|-------|
| ID | `W-1747812345678` |
| Source | `Website` |
| Stage | `New Lead` |
| Agent | `N` (Nick) |
| Score | Auto-calculated from budget + timeline |
| Notes | `Website inquiry: <their message>` |

---

*Last updated: 2026-05-13*
