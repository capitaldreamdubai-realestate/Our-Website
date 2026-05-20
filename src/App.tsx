import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminArticles } from './admin/AdminArticles'
import { AdminDashboard } from './admin/AdminDashboard'
import { AdminHero } from './admin/AdminHero'
import { AdminLayout } from './admin/AdminLayout'
import { AdminLogin } from './admin/AdminLogin'
import { AdminMarketing } from './admin/AdminMarketing'
import { AdminProperties } from './admin/AdminProperties'
import { AdminPropertiesLayout } from './admin/AdminPropertiesLayout'
import { AdminPropertyListingTags, AdminPropertyTypes } from './admin/AdminPropertyLookups'
import { AdminUaeEmirates } from './admin/AdminUaeEmirates'
import { AdminDevelopers } from './admin/AdminDevelopers'
import { AdminSalespeople } from './admin/AdminSalespeople'
import { AdminUsers } from './admin/AdminUsers'
import { AdminIntegrations } from './admin/AdminIntegrations'
import { AdminSiteSettings } from './admin/AdminSiteSettings'
import { AdminExperiences } from './admin/AdminExperiences'
import { AdminFormSubmissions } from './admin/AdminFormSubmissions'
import { AdminFaqs } from './admin/AdminFaqs'
import { AdminMedia } from './admin/AdminMedia'
import { AdminTestimonials } from './admin/AdminTestimonials'
import { AdminCampaignPopups } from './admin/AdminCampaignPopups'
import { SiteLayout } from './layouts/SiteLayout'
import { AboutPage } from './pages/AboutPage'
import { AllPropertiesPage } from './pages/AllPropertiesPage'
import { HomePage } from './pages/HomePage'
import { NewDevelopmentsPage } from './pages/NewDevelopmentsPage'
import { ForRentPage } from './pages/ForRentPage'
import { ForSalePage } from './pages/ForSalePage'
import { DealsPage } from './pages/DealsPage'
import { ArticleDetailPage } from './pages/ArticleDetailPage'
import { ArticlesPage } from './pages/ArticlesPage'
import { ExperiencesPage } from './pages/ExperiencesPage'
import { ContactUsPage } from './pages/ContactUsPage'
import { PropertyDetailPage } from './pages/PropertyDetailPage'
import { TeamMemberDetailPage } from './pages/TeamMemberDetailPage'
import { TeamPage } from './pages/TeamPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/TermsOfServicePage'
import { CookiesPolicyPage } from './pages/CookiesPolicyPage'
import { FaqPage } from './pages/FaqPage'
import { TestimonialsPage } from './pages/TestimonialsPage'
import { DevelopersPage } from './pages/DevelopersPage'
import { DeveloperDetailPage } from './pages/DeveloperDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="properties" element={<AdminPropertiesLayout />}>
          <Route index element={<Navigate to="listings" replace />} />
          <Route path="listings" element={<AdminProperties />} />
          <Route path="neighbourhoods" element={<AdminHero />} />
          <Route path="listing-tags" element={<AdminPropertyListingTags />} />
          <Route path="property-types" element={<AdminPropertyTypes />} />
          <Route path="emirates" element={<AdminUaeEmirates />} />
          <Route path="developers" element={<AdminDevelopers />} />
        </Route>
        <Route path="articles" element={<AdminArticles />} />
        <Route path="faqs" element={<AdminFaqs />} />
        <Route path="testimonials" element={<AdminTestimonials />} />
        <Route path="experiences" element={<AdminExperiences />} />
        <Route path="submissions" element={<AdminFormSubmissions />} />
        <Route path="salespeople" element={<AdminSalespeople />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="marketing" element={<AdminMarketing />} />
        <Route path="campaign-popups" element={<AdminCampaignPopups />} />
        <Route path="integrations" element={<AdminIntegrations />} />
        <Route path="site" element={<AdminSiteSettings />} />
        <Route path="media" element={<AdminMedia />} />
      </Route>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="properties/:propertyId"
          element={<PropertyDetailPage />}
        />
        <Route path="all-properties" element={<AllPropertiesPage />} />
        <Route path="offplan" element={<NewDevelopmentsPage />} />
        <Route
          path="new-developments"
          element={<Navigate to="/offplan" replace />}
        />
        <Route path="for-rent" element={<ForRentPage />} />
        <Route path="for-sale" element={<ForSalePage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="developers" element={<DevelopersPage />} />
        <Route path="developers/:slug" element={<DeveloperDetailPage />} />
        <Route path="off-market" element={<Navigate to="/for-rent" replace />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="team/:slug" element={<TeamMemberDetailPage />} />
        <Route path="experiences" element={<ExperiencesPage />} />
        <Route path="contact-us" element={<ContactUsPage />} />
        <Route path="testimonials" element={<TestimonialsPage />} />
        <Route path="articles" element={<ArticlesPage />} />
        <Route path="articles/:slug" element={<ArticleDetailPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsOfServicePage />} />
        <Route path="cookies" element={<CookiesPolicyPage />} />
      </Route>
    </Routes>
  )
}

export default App
