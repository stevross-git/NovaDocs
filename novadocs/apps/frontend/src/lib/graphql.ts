// frontend/src/lib/graphql.ts
import { GraphQLClient } from 'graphql-request'

const endpoint = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : 'http://localhost:8000/graphql'

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {
    authorization: () => {
      const token = localStorage.getItem('auth_token')
      return token ? `Bearer ${token}` : ''
    }
  }
})