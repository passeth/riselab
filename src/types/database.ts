export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      labdoc_ingredients: {
        Row: {
          id: string
          ingredient_code: string
          ingredient_name: string
          manufacturer: string | null
          origin_country: string | null
          purchase_type: string | null
          purchase_method: string | null
          coa_urls: string[] | null
          composition_urls: string[] | null
          msds_kr_urls: string[] | null
          msds_en_urls: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_code: string
          ingredient_name: string
          manufacturer?: string | null
          origin_country?: string | null
          purchase_type?: string | null
          purchase_method?: string | null
          coa_urls?: string[] | null
          composition_urls?: string[] | null
          msds_kr_urls?: string[] | null
          msds_en_urls?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          ingredient_code?: string
          ingredient_name?: string
          manufacturer?: string | null
          origin_country?: string | null
          purchase_type?: string | null
          purchase_method?: string | null
          coa_urls?: string[] | null
          composition_urls?: string[] | null
          msds_kr_urls?: string[] | null
          msds_en_urls?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      labdoc_ingredient_components: {
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
      labdoc_test_specs: {
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
      labdoc_products_old: {
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
      labdoc_products: {
        Row: {
          id: string
          product_code: string
          management_code: string | null
          korean_name: string | null
          english_name: string | null
          appearance: string | null
          packaging_unit: string | null
          created_date: string | null
          author: string | null
          usage_instructions: string | null
          allergen_korean: string | null
          allergen_english: string | null
          storage_method: string | null
          shelf_life: string | null
          label_volume: string | null
          fill_volume: string | null
          specific_gravity: number | null
          ph_standard: string | null
          viscosity_standard: string | null
          raw_material_report: number | null
          standardized_name: number | null
          responsible_seller: number | null
          recycling_grade: string | null
          label_position: string | null
          functional_claim: string | null
          semi_product_code: string | null
          p_product_code: string | null
          source_file: string | null
          cosmetic_type: string | null      // 화장품 유형
          dosage: string | null             // 용법·용량
          usage_precautions: string | null  // 사용할 때의 주의사항
          remarks: string | null            // 비고
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_code: string
          management_code?: string | null
          korean_name?: string | null
          english_name?: string | null
          appearance?: string | null
          packaging_unit?: string | null
          created_date?: string | null
          author?: string | null
          usage_instructions?: string | null
          allergen_korean?: string | null
          allergen_english?: string | null
          storage_method?: string | null
          shelf_life?: string | null
          label_volume?: string | null
          fill_volume?: string | null
          specific_gravity?: number | null
          ph_standard?: string | null
          viscosity_standard?: string | null
          raw_material_report?: number | null
          standardized_name?: number | null
          responsible_seller?: number | null
          recycling_grade?: string | null
          label_position?: string | null
          functional_claim?: string | null
          semi_product_code?: string | null
          p_product_code?: string | null
          source_file?: string | null
          cosmetic_type?: string | null
          dosage?: string | null
          usage_precautions?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          management_code?: string | null
          korean_name?: string | null
          english_name?: string | null
          appearance?: string | null
          packaging_unit?: string | null
          created_date?: string | null
          author?: string | null
          usage_instructions?: string | null
          allergen_korean?: string | null
          allergen_english?: string | null
          storage_method?: string | null
          shelf_life?: string | null
          label_volume?: string | null
          fill_volume?: string | null
          specific_gravity?: number | null
          ph_standard?: string | null
          viscosity_standard?: string | null
          raw_material_report?: number | null
          standardized_name?: number | null
          responsible_seller?: number | null
          recycling_grade?: string | null
          label_position?: string | null
          functional_claim?: string | null
          semi_product_code?: string | null
          p_product_code?: string | null
          source_file?: string | null
          cosmetic_type?: string | null
          dosage?: string | null
          usage_precautions?: string | null
          remarks?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      labdoc_allergen_regulations: {
        Row: {
          id: number
          allergen_name: string
          inci_name: string | null
          cas_no: string | null
          threshold_leave_on: number
          threshold_rinse_off: number
          annex_ref: string | null
          created_at: string
        }
        Insert: {
          id?: number
          allergen_name: string
          inci_name?: string | null
          cas_no?: string | null
          threshold_leave_on?: number
          threshold_rinse_off?: number
          annex_ref?: string | null
          created_at?: string
        }
        Update: {
          allergen_name?: string
          inci_name?: string | null
          cas_no?: string | null
          threshold_leave_on?: number
          threshold_rinse_off?: number
          annex_ref?: string | null
        }
        Relationships: []
      }
      labdoc_fragrance_allergen_contents: {
        Row: {
          id: number
          supplier: string | null
          fragrance_code: string
          fragrance_name: string | null
          allergen_name: string
          cas_no: string | null
          content_in_fragrance: number
          source_filename: string | null
          created_at: string
        }
        Insert: {
          id?: number
          supplier?: string | null
          fragrance_code: string
          fragrance_name?: string | null
          allergen_name: string
          cas_no?: string | null
          content_in_fragrance: number
          source_filename?: string | null
          created_at?: string
        }
        Update: {
          supplier?: string | null
          fragrance_code?: string
          fragrance_name?: string | null
          allergen_name?: string
          cas_no?: string | null
          content_in_fragrance?: number
          source_filename?: string | null
        }
        Relationships: []
      }
      labdoc_product_bom: {
        Row: {
          id: string
          product_code: string
          sequence_no: number
          ingredient_code: string
          content_ratio: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          product_code: string
          sequence_no: number
          ingredient_code: string
          content_ratio?: number | null
          created_at?: string | null
        }
        Update: {
          product_code?: string
          sequence_no?: number
          ingredient_code?: string
          content_ratio?: number | null
        }
        Relationships: []
      }
      labdoc_product_revisions: {
        Row: {
          id: string
          product_code: string
          revision_no: number
          revision_date: string | null
          revision_content: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          product_code: string
          revision_no: number
          revision_date?: string | null
          revision_content?: string | null
          created_at?: string | null
        }
        Update: {
          product_code?: string
          revision_no?: number
          revision_date?: string | null
          revision_content?: string | null
        }
        Relationships: []
      }
      labdoc_product_english_specs: {
        Row: {
          id: string
          management_code: string
          product_name: string | null
          product_code: string | null
          test_item: string
          specification: string | null
          result: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          management_code: string
          product_name?: string | null
          product_code?: string | null
          test_item: string
          specification?: string | null
          result?: string | null
          created_at?: string | null
        }
        Update: {
          management_code?: string
          product_name?: string | null
          product_code?: string | null
          test_item?: string
          specification?: string | null
          result?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      labdoc_ingredient_summary: {
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
    }
    Functions: {}
  }
}

export type Ingredient = Database['public']['Tables']['labdoc_ingredients']['Row']
export type IngredientInsert = Database['public']['Tables']['labdoc_ingredients']['Insert']
export type IngredientComponent = Database['public']['Tables']['labdoc_ingredient_components']['Row']
export type TestSpecification = Database['public']['Tables']['labdoc_test_specs']['Row']
export type BomMaster = Database['public']['Tables']['bom_master']['Row']
export type LabProduct = Database['public']['Tables']['labdoc_products_old']['Row']
export type LabProductInsert = Database['public']['Tables']['labdoc_products_old']['Insert']
export type LabProductUpdate = Database['public']['Tables']['labdoc_products_old']['Update']
export type AllergenRegulation = Database['public']['Tables']['labdoc_allergen_regulations']['Row']
export type FragranceAllergenContent = Database['public']['Tables']['labdoc_fragrance_allergen_contents']['Row']

// 신규 마이그레이션된 제품 테이블
export type Product = Database['public']['Tables']['labdoc_products']['Row']
export type ProductInsert = Database['public']['Tables']['labdoc_products']['Insert']
export type ProductUpdate = Database['public']['Tables']['labdoc_products']['Update']

// 제품 관련 테이블
export type ProductBom = Database['public']['Tables']['labdoc_product_bom']['Row']
export type ProductRevision = Database['public']['Tables']['labdoc_product_revisions']['Row']
export type ProductEnglishSpec = Database['public']['Tables']['labdoc_product_english_specs']['Row']
