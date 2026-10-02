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
    default:
      return source
  }
}
