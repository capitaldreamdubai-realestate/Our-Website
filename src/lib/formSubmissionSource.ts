export function formSubmissionSourceLabel(source: string): string {
  switch (source) {
    case 'property_brochure':
      return 'Property brochure'
    case 'property_enquiry':
      return 'Property enquiry'
    case 'campaign_popup':
      return 'Campaign popup'
    case 'project_enquiry':
      return 'Project enquiry'
    case 'project_brochure':
      return 'Project brochure'
    case 'contact':
      return 'Contact form'
    case 'newsletter':
      return 'Newsletter'
    case 'whatsapp_click':
      return 'WhatsApp'
    case 'sold_property_seller_enquiry':
      return 'Sold portfolio — seller'
    case 'sold_property_buyer_enquiry':
      return 'Sold portfolio — buyer'
    case 'rented_property_landlord_enquiry':
      return 'Rented portfolio — landlord'
    case 'rented_property_tenant_enquiry':
      return 'Rented portfolio — tenant'
    default:
      return source
  }
}
