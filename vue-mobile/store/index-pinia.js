import { defineStore } from 'pinia'

import state from './state'
import actionsPinia from './actions-pinia'
// import gettersPinia from './getters-pinia'

export const useParanoidEncryptionStore = defineStore('ParanoidEncryptionStore', {
  state: () => (state()),
  actions: actionsPinia,
  // getters: gettersPinia,
})
