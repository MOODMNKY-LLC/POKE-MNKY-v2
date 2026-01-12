// Supabase Management API Types for Platform Kit
export interface paths {
  "/v1/projects/{ref}/database/query": {
    post: {
      parameters: {
        path: {
          ref: string
        }
      }
      requestBody: {
        content: {
          "application/json": {
            query: string
            read_only?: boolean
          }
        }
      }
      responses: {
        200: {
          content: {
            "application/json": any
          }
        }
      }
    }
  }
  "/v1/projects/{ref}/secrets": {
    get: {
      parameters: {
        path: {
          ref: string
        }
      }
      responses: {
        200: {
          content: {
            "application/json": Array<{
              name: string
              value: string
            }>
          }
        }
      }
    }
    post: {
      parameters: {
        path: {
          ref: string
        }
      }
      requestBody: {
        content: {
          "application/json": {
            name: string
            value: string
          }
        }
      }
    }
  }
  "/v1/projects/{ref}": {
    get: {
      parameters: {
        path: {
          ref: string
        }
      }
      responses: {
        200: {
          content: {
            "application/json": {
              id: string
              name: string
              region: string
              database: {
                host: string
                version: string
              }
            }
          }
        }
      }
    }
  }
}
