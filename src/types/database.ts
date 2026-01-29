export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      lab_ingredients: {
        Row: {
          code: string
          name: string
          manufacturer: string | null
          supplier: string | null
          sampling_method: string | null
          sampling_location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          manufacturer?: string | null
          supplier?: string | null
          sampling_method?: string | null
          sampling_location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          manufacturer?: string | null
          supplier?: string | null
          sampling_method?: string | null
          sampling_location?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lab_components: {
        Row: {
          id: string
          ingredient_code: string
          component_order: number
          inci_name_en: string | null
          inci_name_kr: string | null
          cas_number: string | null
          composition_ratio: number | null
          function: string | null
          country_of_origin: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_code: string
          component_order: number
          inci_name_en?: string | null
          inci_name_kr?: string | null
          cas_number?: string | null
          composition_ratio?: number | null
          function?: string | null
          country_of_origin?: string | null
          created_at?: string
        }
        Update: {
          ingredient_code?: string
          component_order?: number
          inci_name_en?: string | null
          inci_name_kr?: string | null
          cas_number?: string | null
          composition_ratio?: number | null
          function?: string | null
          country_of_origin?: string | null
        }
        Relationships: []
      }
      lab_test_specs: {
        Row: {
          id: string
          ingredient_code: string
          test_item: string
          specification: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_code: string
          test_item: string
          specification: string
          display_order?: number
          created_at?: string
        }
        Update: {
          test_item?: string
          specification?: string
          display_order?: number
        }
        Relationships: []
      }
      lab_reports: {
        Row: {
          id: string
          report_number: string
          ingredient_code: string
          ingredient_name: string | null
          lot_number: string
          test_date: string
          tester_name: string
          overall_result: 'PASS' | 'FAIL' | 'PENDING'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          report_number?: string
          ingredient_code: string
          ingredient_name?: string | null
          lot_number: string
          test_date: string
          tester_name: string
          overall_result?: 'PASS' | 'FAIL' | 'PENDING'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          ingredient_code?: string
          ingredient_name?: string | null
          lot_number?: string
          test_date?: string
          tester_name?: string
          overall_result?: 'PASS' | 'FAIL' | 'PENDING'
          notes?: string | null
        }
        Relationships: []
      }
      lab_report_items: {
        Row: {
          id: string
          report_id: string
          test_item: string
          specification: string
          test_result: string | null
          judgment: 'PASS' | 'FAIL' | 'PENDING'
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          test_item: string
          specification: string
          test_result?: string | null
          judgment?: 'PASS' | 'FAIL' | 'PENDING'
          display_order?: number
          created_at?: string
        }
        Update: {
          test_item?: string
          specification?: string
          test_result?: string | null
          judgment?: 'PASS' | 'FAIL' | 'PENDING'
          display_order?: number
        }
        Relationships: []
      }
      bom_master: {
        Row: {
          품목구분: string | null
          bom버전: string | null
          생산품목명: string | null
          materialcode: string | null
          materialname: string | null
          sort: string | null
          usemount: number | null
          prdcode: string | null
          price: number | null
          company: string | null
          구매처코드: string | null
          remerk: string | null
          created_at: string | null
        }
        Insert: {
          품목구분?: string | null
          bom버전?: string | null
          생산품목명?: string | null
          materialcode?: string | null
          materialname?: string | null
          sort?: string | null
          usemount?: number | null
          prdcode?: string | null
          price?: number | null
          company?: string | null
          구매처코드?: string | null
          remerk?: string | null
          created_at?: string | null
        }
        Update: {
          품목구분?: string | null
          bom버전?: string | null
          생산품목명?: string | null
          materialcode?: string | null
          materialname?: string | null
          sort?: string | null
          usemount?: number | null
          prdcode?: string | null
          price?: number | null
          company?: string | null
          구매처코드?: string | null
          remerk?: string | null
        }
        Relationships: []
      }
      lab_products: {
        Row: {
          prdcode: string
          product_name: string
          semi_product_code: string | null
          p_product_code: string | null
          category: string | null
          bom_version: string | null
          status: 'active' | 'discontinued' | 'development'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          prdcode: string
          product_name: string
          semi_product_code?: string | null
          p_product_code?: string | null
          category?: string | null
          bom_version?: string | null
          status?: 'active' | 'discontinued' | 'development'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          prdcode?: string
          product_name?: string
          semi_product_code?: string | null
          p_product_code?: string | null
          category?: string | null
          bom_version?: string | null
          status?: 'active' | 'discontinued' | 'development'
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      lab_ingredient_summary: {
        Row: {
          code: string
          name: string
          manufacturer: string | null
          supplier: string | null
          component_count: number
          total_ratio: number | null
          inci_names: string[]
        }
        Relationships: []
      }
      lab_recent_reports: {
        Row: {
          id: string
          report_number: string
          ingredient_code: string
          ingredient_name: string | null
          lot_number: string
          test_date: string
          tester_name: string
          overall_result: string
          item_count: number
          pass_count: number
          fail_count: number
        }
        Relationships: []
      }
    }
    Functions: {}
  }
}

export type Ingredient = Database['public']['Tables']['lab_ingredients']['Row']
export type IngredientInsert = Database['public']['Tables']['lab_ingredients']['Insert']
export type IngredientComponent = Database['public']['Tables']['lab_components']['Row']
export type TestSpecification = Database['public']['Tables']['lab_test_specs']['Row']
export type TestReport = Database['public']['Tables']['lab_reports']['Row']
export type TestReportInsert = Database['public']['Tables']['lab_reports']['Insert']
export type TestReportItem = Database['public']['Tables']['lab_report_items']['Row']
export type TestReportItemInsert = Database['public']['Tables']['lab_report_items']['Insert']
export type BomMaster = Database['public']['Tables']['bom_master']['Row']
export type LabProduct = Database['public']['Tables']['lab_products']['Row']
export type LabProductInsert = Database['public']['Tables']['lab_products']['Insert']
export type LabProductUpdate = Database['public']['Tables']['lab_products']['Update']
