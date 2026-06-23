export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          slug: string | null
          title: string
          tag: string
          tags: string[]
          meta: string | null
          detail: string | null
          alt: string
          image_url: string
          price_aed: number | null
          beds: number | null
          baths: number | null
          location: string | null
          neighbourhood: string | null
          emirate: string | null
          exclusive_with_us: boolean
          interior_m2: number | null
          plot_m2: number | null
          latitude: number | null
          longitude: number | null
          full_address: string | null
          description_html: string | null
          property_ref_id: string | null
          year_built: number | null
          gallery: Json
          home_section: 'featured' | 'more_homes' | 'none'
          sort_order_home: number
          published: boolean
          salesperson_id: string | null
          property_type: string | null
          developer_id: string | null
          listing_source: 'cms' | 'property_finder'
          pf_listing_id: string | null
          pf_payload: Json | null
          pf_state_stage: string | null
          pf_state_type: string | null
          pf_category: string | null
          pf_offering_type: string | null
          pf_project_status: string | null
          pf_verification_status: string | null
          pf_quality_score: number | null
          pf_assigned_to_id: string | null
          pf_assigned_to_name: string | null
          pf_created_by_id: string | null
          pf_location_id: string | null
          pf_location_name: string | null
          pf_latitude: number | null
          pf_longitude: number | null
          pf_price_type: string | null
          pf_price_on_request: boolean
          pf_price_raw: Json | null
          pf_currency: string | null
          pf_published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          slug?: string | null
          title: string
          tag?: string
          tags?: string[]
          meta?: string | null
          detail?: string | null
          alt?: string
          image_url: string
          price_aed?: number | null
          beds?: number | null
          baths?: number | null
          location?: string | null
          neighbourhood?: string | null
          emirate?: string | null
          exclusive_with_us?: boolean
          interior_m2?: number | null
          plot_m2?: number | null
          latitude?: number | null
          longitude?: number | null
          full_address?: string | null
          description_html?: string | null
          property_ref_id?: string | null
          year_built?: number | null
          gallery?: Json
          home_section?: 'featured' | 'more_homes' | 'none'
          sort_order_home?: number
          published?: boolean
          salesperson_id?: string | null
          property_type?: string | null
          developer_id?: string | null
          listing_source?: 'cms' | 'property_finder'
          pf_listing_id?: string | null
          pf_payload?: Json | null
          pf_state_stage?: string | null
          pf_state_type?: string | null
          pf_category?: string | null
          pf_offering_type?: string | null
          pf_project_status?: string | null
          pf_verification_status?: string | null
          pf_quality_score?: number | null
          pf_assigned_to_id?: string | null
          pf_assigned_to_name?: string | null
          pf_created_by_id?: string | null
          pf_location_id?: string | null
          pf_location_name?: string | null
          pf_latitude?: number | null
          pf_longitude?: number | null
          pf_price_type?: string | null
          pf_price_on_request?: boolean
          pf_price_raw?: Json | null
          pf_currency?: string | null
          pf_published_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
        Relationships: []
      }
      property_listing_tags: {
        Row: {
          id: string
          name: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['property_listing_tags']['Insert']>
        Relationships: []
      }
      property_type_options: {
        Row: {
          id: string
          name: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['property_type_options']['Insert']>
        Relationships: []
      }
      salespeople: {
        Row: {
          id: string
          slug: string
          name: string
          title: string
          bio: string
          profile_image_url: string
          listings_count: number
          phone: string | null
          email: string | null
          social_links: Json
          pf_public_profile_id: string | null
          pf_user_id: string | null
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          slug: string
          name: string
          title?: string
          bio?: string
          profile_image_url?: string
          listings_count?: number
          phone?: string | null
          email?: string | null
          social_links?: Json
          pf_public_profile_id?: string | null
          pf_user_id?: string | null
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['salespeople']['Insert']>
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string
          full_name: string
          role: 'owner' | 'admin' | 'editor' | 'viewer'
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email: string
          full_name?: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
          is_active?: boolean
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
        Relationships: []
      }
      articles: {
        Row: {
          id: string
          slug: string
          title: string
          date_label: string | null
          author: string | null
          image_url: string
          alt: string | null
          excerpt: string | null
          date_long: string | null
          last_updated: string | null
          toc: Json
          sections: Json
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          slug: string
          title: string
          date_label?: string | null
          author?: string | null
          image_url: string
          alt?: string | null
          excerpt?: string | null
          date_long?: string | null
          last_updated?: string | null
          toc?: Json
          sections?: Json
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['articles']['Insert']>
        Relationships: []
      }
      hero_neighbourhoods: {
        Row: {
          id: string
          label: string
          route_path: string
          sort_order: number
          published: boolean
          updated_at: string
        }
        Insert: {
          id: string
          label: string
          route_path?: string
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['hero_neighbourhoods']['Insert']>
        Relationships: []
      }
      offplan_projects: {
        Row: {
          id: string
          slug: string
          name: string
          short_description: string
          description_html: string | null
          hero_image_url: string | null
          gallery: Json
          brochure_url: string | null
          brochure_storage_path: string | null
          launch_status: 'new' | 'existing' | 'upcoming'
          developer_id: string
          salesperson_id: string | null
          location: string | null
          emirate: string | null
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          short_description?: string
          description_html?: string | null
          hero_image_url?: string | null
          gallery?: Json
          brochure_url?: string | null
          brochure_storage_path?: string | null
          launch_status?: 'new' | 'existing' | 'upcoming'
          developer_id: string
          salesperson_id?: string | null
          location?: string | null
          emirate?: string | null
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['offplan_projects']['Insert']>
        Relationships: []
      }
      property_developers: {
        Row: {
          id: string
          slug: string
          name: string
          description_html: string | null
          logo_url: string | null
          website_url: string | null
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description_html?: string | null
          logo_url?: string | null
          website_url?: string | null
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['property_developers']['Insert']>
        Relationships: []
      }
      uae_emirates: {
        Row: {
          id: string
          name: string
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['uae_emirates']['Insert']>
        Relationships: []
      }
      marketing_pages: {
        Row: {
          id: string
          slug: string
          title: string
          body_html: string | null
          hero_image_url: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          body_html?: string | null
          hero_image_url?: string | null
        }
        Update: Partial<Database['public']['Tables']['marketing_pages']['Insert']>
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          value: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: Partial<Database['public']['Tables']['site_settings']['Insert']>
        Relationships: []
      }
      form_submissions: {
        Row: {
          id: string
          created_at: string
          source: 'property_enquiry' | 'campaign_popup' | 'project_enquiry' | 'project_brochure'
          property_id: string | null
          property_title: string | null
          project_id: string | null
          project_name: string | null
          popup_id: string | null
          name: string
          email: string
          phone: string | null
          message: string | null
          meta: Json
        }
        Insert: {
          id?: string
          created_at?: string
          source: 'property_enquiry' | 'campaign_popup' | 'project_enquiry' | 'project_brochure'
          property_id?: string | null
          property_title?: string | null
          project_id?: string | null
          project_name?: string | null
          popup_id?: string | null
          name: string
          email: string
          phone?: string | null
          message?: string | null
          meta?: Json
        }
        Update: Partial<Database['public']['Tables']['form_submissions']['Insert']>
        Relationships: []
      }
      campaign_popups: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          internal_name: string
          title: string
          description: string | null
          image_url: string
          active: boolean
          trigger_type: 'immediate' | 'delay' | 'scroll'
          trigger_delay_seconds: number | null
          trigger_scroll_percent: number | null
          target_paths: string[]
          show_once_per_session: boolean
          submit_button_label: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          internal_name: string
          title: string
          description?: string | null
          image_url: string
          active?: boolean
          trigger_type?: 'immediate' | 'delay' | 'scroll'
          trigger_delay_seconds?: number | null
          trigger_scroll_percent?: number | null
          target_paths?: string[]
          show_once_per_session?: boolean
          submit_button_label?: string | null
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['campaign_popups']['Insert']>
        Relationships: []
      }
      experiences: {
        Row: {
          id: string
          phase: string
          title: string
          excerpt: string | null
          media_type: 'image' | 'video'
          media_url: string
          poster_url: string | null
          alt: string
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phase: string
          title: string
          excerpt?: string | null
          media_type?: 'image' | 'video'
          media_url: string
          poster_url?: string | null
          alt?: string
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['experiences']['Insert']>
        Relationships: []
      }
      cms_media: {
        Row: {
          id: string
          storage_path: string
          public_url: string
          folder: string
          original_filename: string
          mime_type: string
          file_size_bytes: number | null
          kind: 'image' | 'video' | 'document'
          alt_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          storage_path: string
          public_url: string
          folder?: string
          original_filename?: string
          mime_type?: string
          file_size_bytes?: number | null
          kind?: 'image' | 'video' | 'document'
          alt_text?: string | null
        }
        Update: Partial<Database['public']['Tables']['cms_media']['Insert']>
        Relationships: []
      }
      faq_topics: {
        Row: {
          id: string
          slug: string
          title: string
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['faq_topics']['Insert']>
        Relationships: []
      }
      faq_entries: {
        Row: {
          id: string
          topic_id: string
          question: string
          answer: string
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          question: string
          answer: string
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['faq_entries']['Insert']>
        Relationships: []
      }
      testimonials: {
        Row: {
          id: string
          quote: string
          author_name: string
          author_role: string | null
          author_location: string | null
          rating: number
          status: 'pending' | 'approved' | 'declined'
          sort_order: number
          created_at: string
          updated_at: string
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          quote: string
          author_name: string
          author_role?: string | null
          author_location?: string | null
          rating?: number
          status?: 'pending' | 'approved' | 'declined'
          sort_order?: number
          reviewed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['testimonials']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
