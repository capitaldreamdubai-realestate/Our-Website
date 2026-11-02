import { getArticleBySlug, type Article } from './articles'

export type ArticleTocEntry =
  | { id: string; label: string }
  | {
      id: string
      label: string
      subItems: { id: string; label: string }[]
    }

export type ArticleBodySection = {
  id: string
  heading: string
  paragraphs: string[]
}

export type ArticleDetailModel = Article & {
  dateLong: string
  lastUpdated: string
  toc: ArticleTocEntry[]
  sections: ArticleBodySection[]
}

const detailsBySlug: Record<
  string,
  {
    dateLong: string
    lastUpdated: string
    toc: ArticleTocEntry[]
    sections: ArticleBodySection[]
  }
> = {
  'dubai-property-buying-costs': {
    dateLong: '2 November 2026',
    lastUpdated: '2 November 2026',
    toc: [
      { id: 'short-answer', label: 'The short answer' },
      { id: 'dld-fee', label: 'Dubai Land Department fees' },
      { id: 'agency', label: 'Agency commission' },
      { id: 'mortgage', label: 'If you are using a mortgage' },
      { id: 'noc-service', label: 'Developer NOC and service charges' },
      { id: 'example', label: 'Worked example: AED 2 million apartment' },
      { id: 'next', label: 'Before you make an offer' },
    ],
    sections: [
      {
        id: 'short-answer',
        heading: 'The short answer',
        paragraphs: [
          'For a cash purchase of a ready home in Dubai, budget roughly 6–7% on top of the agreed price. With a mortgage, add a little over 1% of the loan amount on top of that. The single largest cost is the Dubai Land Department (DLD) transfer fee, and none of these costs can be added to a mortgage, so they must be paid in cash.',
        ],
      },
      {
        id: 'dld-fee',
        heading: 'Dubai Land Department fees',
        paragraphs: [
          'The DLD transfer fee is 4% of the purchase price. By market convention the buyer pays it, although who pays is ultimately set out in the sale contract (Form F). The transfer itself is processed at a Registration Trustee office, which charges a fixed service fee plus VAT; the fee is higher for properties above AED 500,000. A small title deed issuance fee is added on the day.',
          '<p>Fees are set by the DLD and do change. Check the current schedule on the <a href="https://dubailand.gov.ae/en/" target="_blank" rel="noopener noreferrer">Dubai Land Department website</a> before you budget, or see our <a href="/faq">buying FAQ</a> for the questions clients ask most.</p>',
        ],
      },
      {
        id: 'agency',
        heading: 'Agency commission',
        paragraphs: [
          'Agency commission on resale property in Dubai is typically 2% of the purchase price, plus 5% VAT on the commission. It is usually paid on the day of transfer. When you buy off-plan directly from a developer, the developer normally pays the agent, so the buyer does not.',
        ],
      },
      {
        id: 'mortgage',
        heading: 'If you are using a mortgage',
        paragraphs: [
          'Mortgage registration with the DLD costs 0.25% of the loan amount plus an admin fee. Banks also charge an arrangement fee (often up to 1% of the loan) and a valuation fee, usually a few thousand dirhams.',
          'UAE Central Bank rules set the minimum deposit. For an expatriate buying a first home worth up to AED 5 million, the minimum down payment is 20%; above AED 5 million it rises. Non-resident buyers are usually asked for a larger deposit by the lender. Get a pre-approval before you view seriously, so you know your real budget.',
        ],
      },
      {
        id: 'noc-service',
        heading: 'Developer NOC and service charges',
        paragraphs: [
          'Before transfer, the seller must obtain a No Objection Certificate (NOC) from the master developer confirming that service charges are paid up. The developer charges a fee for it, and who pays is agreed in the contract.',
          'After you buy, you pay annual service charges to the owners association, calculated per square foot. Rates for each building are registered with the DLD. Ask for the latest service charge invoice before you make an offer: in some towers it changes the net yield more than the price does.',
        ],
      },
      {
        id: 'example',
        heading: 'Worked example: AED 2 million apartment',
        paragraphs: [
          '<p>An illustrative cash purchase of a ready apartment at AED 2,000,000:</p><ul><li>DLD transfer fee (4%): AED 80,000</li><li>Agency commission (2% + 5% VAT): AED 42,000</li><li>Registration Trustee fee: about AED 4,200 including VAT</li><li>Title deed issuance and DLD admin fees: a few hundred dirhams</li></ul><p>That comes to roughly AED 126,500, or about 6.3% of the price, before any developer NOC fee. With a mortgage, add 0.25% of the loan for registration plus the bank’s own fees.</p>',
        ],
      },
      {
        id: 'next',
        heading: 'Before you make an offer',
        paragraphs: [
          '<p>Ask for the title deed, the Trakheesi permit number on the advert, the latest service charge invoice and the tenancy status if the property is let. Then compare the asking price with recent DLD transactions in the same building. Browse <a href="/for-sale">properties for sale in Dubai</a>, or <a href="/contact-us">speak to our team in Meydan</a> for a full cost sheet on a specific property.</p>',
        ],
      },
    ],
  },
  'dubai-off-plan-buying-guide': {
    dateLong: '2 November 2026',
    lastUpdated: '2 November 2026',
    toc: [
      { id: 'how-it-works', label: 'How off-plan works in Dubai' },
      { id: 'escrow', label: 'Where your money goes: escrow' },
      { id: 'oqood', label: 'Oqood registration and the DLD fee' },
      { id: 'payment-plans', label: 'Reading a payment plan' },
      { id: 'mortgage', label: 'Financing off-plan' },
      { id: 'checks', label: 'Checks before you sign the SPA' },
      { id: 'handover', label: 'Handover and snagging' },
    ],
    sections: [
      {
        id: 'how-it-works',
        heading: 'How off-plan works in Dubai',
        paragraphs: [
          'Buying off-plan means buying from a developer before the building is finished. You pay a booking deposit, sign a Sale and Purchase Agreement (SPA), and then pay instalments during construction, with the balance due at handover or, on post-handover plans, spread over the years after you get the keys.',
        ],
      },
      {
        id: 'escrow',
        heading: 'Where your money goes: escrow',
        paragraphs: [
          'Dubai law (Law No. 8 of 2007) requires off-plan projects to be registered with the Real Estate Regulatory Agency (RERA) and buyer payments to go into a project escrow account. The developer can only draw from that account as construction progresses.',
          'In practice: pay only into the escrow account named in your SPA, never into an agent’s or an individual’s account. You can check a project’s registration and completion status through the Dubai Land Department’s Dubai REST app.',
        ],
      },
      {
        id: 'oqood',
        heading: 'Oqood registration and the DLD fee',
        paragraphs: [
          'Off-plan sales are registered on the DLD’s interim register, known as Oqood. The 4% DLD fee applies to off-plan purchases too and is normally paid at registration, early in the process. Some launches advertise a full or partial DLD fee waiver; read the SPA to see exactly what the developer covers.',
        ],
      },
      {
        id: 'payment-plans',
        heading: 'Reading a payment plan',
        paragraphs: [
          'Plans are usually described as a split, such as 60/40 (60% during construction, 40% at handover) or 50/50 with a post-handover period. Compare plans on total price and on when the large payments fall, not on the headline down payment. A low entry deposit with a large handover payment needs either cash or a mortgage ready on that date.',
        ],
      },
      {
        id: 'mortgage',
        heading: 'Financing off-plan',
        paragraphs: [
          'Most UAE banks will not lend on an off-plan unit until it is close to completion, and Central Bank rules cap lending on off-plan property at 50% of its value. Plan to fund construction instalments in cash, and speak to a mortgage adviser well before the handover payment is due.',
        ],
      },
      {
        id: 'checks',
        heading: 'Checks before you sign the SPA',
        paragraphs: [
          '<ul><li><strong>Developer record:</strong> look at how the developer’s previous projects were delivered and how they are holding value. Our <a href="/developers">Dubai developer profiles</a> list current inventory by developer.</li><li><strong>Completion date and delay terms:</strong> what the SPA says happens if handover is late.</li><li><strong>Resale rules:</strong> many SPAs require a minimum percentage paid before you can sell before completion.</li><li><strong>Service charge estimate:</strong> ask for it now, so your rental yield maths is realistic.</li><li><strong>Specification:</strong> make sure finishes, appliances and parking are listed in the SPA, not just the brochure.</li></ul>',
        ],
      },
      {
        id: 'handover',
        heading: 'Handover and snagging',
        paragraphs: [
          '<p>Before handover, inspect the unit and list defects (snagging) for the developer to fix. Once the final payment is made, the Oqood registration is converted into a title deed. To compare current launches and their payment plans, browse <a href="/offplan">off-plan projects in Dubai</a> or <a href="/contact-us">ask our team</a> for the SPA and payment schedule of a specific project.</p>',
        ],
      },
    ],
  },
  'renting-in-dubai-guide': {
    dateLong: '2 November 2026',
    lastUpdated: '2 November 2026',
    toc: [
      { id: 'costs', label: 'What you pay upfront' },
      { id: 'checks', label: 'Checks before you pay anything' },
      { id: 'ejari', label: 'Ejari registration' },
      { id: 'increases', label: 'How rent increases work' },
      { id: 'notice', label: 'Notice periods and eviction' },
      { id: 'next', label: 'Finding the right home' },
    ],
    sections: [
      {
        id: 'costs',
        heading: 'What you pay upfront',
        paragraphs: [
          '<ul><li><strong>Rent:</strong> quoted per year and usually paid in one to four cheques. Fewer cheques can help you negotiate a lower rent.</li><li><strong>Security deposit:</strong> commonly 5% of annual rent for unfurnished homes and 10% for furnished, refundable at the end of the tenancy.</li><li><strong>Agency fee:</strong> typically 5% of annual rent plus VAT.</li><li><strong>Ejari registration:</strong> a small fee to register the contract.</li><li><strong>DEWA deposit:</strong> a refundable deposit to connect water and electricity, higher for villas than for apartments.</li></ul>',
        ],
      },
      {
        id: 'checks',
        heading: 'Checks before you pay anything',
        paragraphs: [
          'Ask to see the landlord’s title deed and passport (or a valid power of attorney if someone else is signing). Check that the advert carries a Trakheesi permit number and that your agent holds a RERA broker card. Use the standard Dubai unified tenancy contract and write any agreed extras, such as maintenance or furniture, into the addendum.',
        ],
      },
      {
        id: 'ejari',
        heading: 'Ejari registration',
        paragraphs: [
          'Every tenancy contract in Dubai must be registered with Ejari, the DLD’s tenancy registration system. You need it to connect DEWA, to sponsor family members’ residence visas and to bring any case to the Rental Dispute Centre. Make sure it is done within the first days of the tenancy.',
        ],
      },
      {
        id: 'increases',
        heading: 'How rent increases work',
        paragraphs: [
          'Rent increases at renewal are capped by Decree No. 43 of 2013 and measured against the DLD rental index for comparable homes in the same area. If your rent is already close to the index average, the landlord cannot increase it; the further below the average it is, the larger the permitted increase, in bands of 5% up to a maximum of 20%.',
          'Use the official DLD rental index calculator with your area, property type and current rent to see the exact figure before you negotiate a renewal.',
        ],
      },
      {
        id: 'notice',
        heading: 'Notice periods and eviction',
        paragraphs: [
          'Either party who wants to change the terms of the contract at renewal, including the rent, must give at least 90 days’ written notice before it expires. A landlord who wants the property back at the end of a tenancy, for example to sell it or move in, must give 12 months’ notice through a notary public or registered mail, and only for the reasons the law allows. Disputes go to the Rental Dispute Centre.',
        ],
      },
      {
        id: 'next',
        heading: 'Finding the right home',
        paragraphs: [
          '<p>Browse <a href="/for-rent">properties for rent in Dubai</a>, read our <a href="/faq">FAQ on renting and visas</a>, or <a href="/contact-us">tell us what you need</a> and we will shortlist homes that fit your budget and commute.</p>',
        ],
      },
    ],
  },
  'uae-golden-visa-through-property': {
    dateLong: '2 November 2026',
    lastUpdated: '2 November 2026',
    toc: [
      { id: 'what', label: 'What the Golden Visa gives you' },
      { id: 'threshold', label: 'The AED 2 million threshold' },
      { id: 'mortgage-offplan', label: 'Mortgaged and off-plan property' },
      { id: 'family', label: 'Sponsoring your family' },
      { id: 'documents', label: 'Documents to prepare' },
      { id: 'choosing', label: 'Choosing the property' },
    ],
    sections: [
      {
        id: 'what',
        heading: 'What the Golden Visa gives you',
        paragraphs: [
          'The UAE Golden Visa is a 10-year, renewable residence visa. Property investors qualify through real estate they own in the UAE, and the visa stays valid while you spend long periods outside the country, unlike a standard residence visa.',
        ],
      },
      {
        id: 'threshold',
        heading: 'The AED 2 million threshold',
        paragraphs: [
          'To qualify as a property investor, the property you own must be worth at least AED 2 million. This can be a single property or a portfolio adding up to that value. If you own jointly, the value of your own share is what counts, so check how ownership is recorded on the title deed before you rely on it.',
        ],
      },
      {
        id: 'mortgage-offplan',
        heading: 'Mortgaged and off-plan property',
        paragraphs: [
          'Mortgaged property can qualify; the bank will need to issue a letter supporting the application. Off-plan property bought from approved developers can also qualify in Dubai. The rules for both have changed several times, so confirm the current criteria with the Dubai Land Department before you buy specifically to meet them.',
        ],
      },
      {
        id: 'family',
        heading: 'Sponsoring your family',
        paragraphs: [
          'Golden Visa holders can sponsor their spouse and children, and in many cases domestic staff. Each family member needs their own application, medical test and Emirates ID.',
        ],
      },
      {
        id: 'documents',
        heading: 'Documents to prepare',
        paragraphs: [
          'Expect to need your title deed (or the Oqood certificate for off-plan), a property valuation where required, your passport and photo, health insurance and a medical fitness test inside the UAE. Applications run through the DLD and the immigration authorities, and fees and checklists change, so use the official channel’s current list.',
        ],
      },
      {
        id: 'choosing',
        heading: 'Choosing the property',
        paragraphs: [
          '<p>Buy the property for its own merits first: location, service charges, rental demand and resale liquidity. A home that only makes sense because it crosses AED 2 million is a weak investment. Browse <a href="/for-sale">Dubai properties for sale</a> and <a href="/offplan">off-plan projects</a>, or <a href="/contact-us">ask us</a> which options meet the threshold in your preferred area.</p>',
        ],
      },
    ],
  },
  'living-in-meydan-guide': {
    dateLong: '2 November 2026',
    lastUpdated: '2 November 2026',
    toc: [
      { id: 'where', label: 'Where Meydan is' },
      { id: 'communities', label: 'Communities around Meydan' },
      { id: 'commute', label: 'Getting around' },
      { id: 'lifestyle', label: 'Everyday life' },
      { id: 'suits', label: 'Who Meydan suits' },
    ],
    sections: [
      {
        id: 'where',
        heading: 'Where Meydan is',
        paragraphs: [
          'Meydan sits inside Mohammed Bin Rashid Al Maktoum City (MBR City), between Al Khail Road and Ras Al Khor Road, just south-east of Downtown Dubai. It is built around Meydan Racecourse, home of the Dubai World Cup. Our own office is here, at Rosebay Living in Meydan, so this is the area we know best.',
        ],
      },
      {
        id: 'communities',
        heading: 'Communities around Meydan',
        paragraphs: [
          'The wider MBR City area mixes ready and off-plan homes. Sobha Hartland offers apartments, townhouses and villas around green space and international schools. District One is known for large villas around a man-made lagoon. Apartment communities closer to the racecourse, such as Azizi Riviera, attract tenants and first-time buyers looking for newer stock at lower prices than Downtown.',
        ],
      },
      {
        id: 'commute',
        heading: 'Getting around',
        paragraphs: [
          'Al Khail Road connects Meydan to Business Bay and the rest of the city. Outside rush hour, Downtown Dubai is usually around 10–15 minutes by car and Dubai International Airport around 20 minutes. Most residents drive or use taxis, as metro coverage in the area is limited.',
        ],
      },
      {
        id: 'lifestyle',
        heading: 'Everyday life',
        paragraphs: [
          'Expect quieter streets than Downtown or Dubai Marina, with parks, cycle tracks and community retail within the master plans. The Ras Al Khor Wildlife Sanctuary, known for its flamingos, is close by. Much of MBR City is still being built, so check the construction plans around any building before you commit.',
        ],
      },
      {
        id: 'suits',
        heading: 'Who Meydan suits',
        paragraphs: [
          '<p>Meydan works well for families who want space within a short drive of Downtown, and for investors looking at newer buildings and off-plan launches in a central location. Browse <a href="/all-properties">all our Dubai listings</a>, compare <a href="/offplan">off-plan projects</a>, or <a href="/contact-us">visit us at Rosebay Living</a> for a walk around the area.</p>',
        ],
      },
    ],
  },
}

export function getArticleDetailModel(slug: string | undefined): ArticleDetailModel | undefined {
  if (!slug) return undefined
  const base = getArticleBySlug(slug)
  if (!base) return undefined
  const extra = detailsBySlug[slug]
  if (!extra) {
    return {
      ...base,
      dateLong: base.dateLabel,
      lastUpdated: base.dateLabel,
      toc: [{ id: 'overview', label: 'Overview' }],
      sections: [
        {
          id: 'overview',
          heading: 'Overview',
          paragraphs: [base.excerpt],
        },
      ],
    }
  }
  return { ...base, ...extra }
}
