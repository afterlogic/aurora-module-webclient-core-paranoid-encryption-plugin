<template>
  <div>
    <div v-if="shareableLinkParams.recipient">
      <div class="dialog__title-text q-mx-lg" @click="test">
        <span>
          {{ $t('OPENPGPFILESWEBCLIENT.HEADING_SEND_ENCRYPTED_FILE') }}
        </span>
      </div>
      <div class="q-mx-lg q-mb-sm recipient">
        <span>Recepient:</span>
      </div>
      <app-contact-item @click="changeRecipient" class="q-pb-md q-mx-lg" :contact="shareableLinkParams.recipient"/>
      <div class="q-px-lg">
        <span class="inscription">
          Selected recipient has PGP key. The data can be encrypted using this key.
        </span>
      </div>
      <div class="header q-mx-lg">
        <span>Encryption type</span>
      </div>
      <div class="q-mx-md q-mt-md">
        <q-option-group
            v-model="shareableLinkParams.encryptionType"
            keep-color
            size="32px"
            :options="encryptOptions"
            type="radio"
        />
      </div>
      <div class="separator q-mt-md"/>
      <div class="q-my-md q-mx-lg">
        <span class="inscription">{{ $t('OPENPGPFILESWEBCLIENT.HINT_KEY_BASED_ENCRYPTION') }}</span>
      </div>
      <div class="q-mx-lg">
        <app-checkbox
            :disable="shareableLinkParams.encryptionType === 'password'"
            v-model="shareableLinkParams.addDigitalSignature"
            :leftLabel="true"
            :label="$t('OPENPGPFILESWEBCLIENT.LABEL_SIGN')"
        />
      </div>
      <div class="q-my-md q-mx-lg inscription">
        <span>
          {{ inscription }}
        </span>
      </div>
    </div>
    <div v-else>
      <div class="q-px-lg dialog__title-text">
        <span>
          {{ $t('OPENPGPFILESWEBCLIENT.HEADING_SEND_ENCRYPTED_FILE') }}
        </span>
      </div>
      <div class="q-px-lg" style="margin-top: 32px">
        <q-input
            v-model="searchText"
            :style="{ height: '36px' }"
            :input-style="{ height: '36px' }"
            placeholder="Search"
            autofocus
            borderless
            outlined
            dense
            class="q-mb-lg contact-search"
            debounce="400"
        />
        <div v-if="isWaitingContacts" class="flex items-center justify-center">
          <q-circular-progress
              indeterminate
              size="40px"
              color="primary"
              class="q-ma-md"
          />
        </div>
        <q-scroll-area v-else class="full-width" :thumb-style="{ width: '0' }" style="height: 300px">
          <app-contact-item
              v-for="contact in foundContacts"
              :contact="contact"
              :key="contact.ETag"
              @click="selectContact(contact)"
              class="q-mb-md"
          />
        </q-scroll-area>
      </div>
    </div>
  </div>
</template>

<script>
import eventBus from "src/event-bus";
import { mapActions } from 'vuex'
import SelectRecipientDialog
  from "../../../../../../FilesMobileWebclient/vue-mobile/components/dialogs/SelectRecipientDialog";
import AppContactItem from "components/common/AppContactItem";
import AppCheckbox from "components/common/AppCheckbox";

export default {
  name: "EncryptedShareableLinkHead",
  components: {
    SelectRecipientDialog,
    AppContactItem,
    AppCheckbox
  },
  data: () => ({
    showSelectRecipientDialog: true,
    shareableLinkParams: {
      recipient: null,
      encryptionType: 'password',
      addDigitalSignature: false,
    },
    isWaitingContacts: false,
    contacts: [],
    searchText: ''
  }),
  async mounted() {
    this.isWaitingContacts = true
    this.contacts = await this.getContacts({
      Search:"",
      Storage:"all",
      SortField:3,
      SortOrder:1,
      WithGroups:false,
      WithoutTeamContactsDuplicates:true
    })
    this.isWaitingContacts = false
  },
  computed: {
    foundContacts() {
      return this.contacts.filter( contact => {
        const index = contact.ViewEmail.indexOf(this.searchText)
        if (index + 1) return contact
      } )
    },
    encryptOptions() {
      return [
        {
          label: this.$t('OPENPGPFILESWEBCLIENT.LABEL_KEY_BASED_ENCRYPTION'),
          value: 'key',
          color: 'primary',
          disable: !this.shareableLinkParams.recipient.HasPgpPublicKey
        },
        {
          label: this.$t('OPENPGPFILESWEBCLIENT.LABEL_PASSWORD_BASED_ENCRYPTION'),
          value: 'password',
          color: 'primary'
        },
      ]
    },
    inscription() {
      if (this.shareableLinkParams?.encryptionType === 'key') {
        if (this.shareableLinkParams.addDigitalSignature) {
          return this.$t('OPENPGPFILESWEBCLIENT.HINT_SIGN_FILE')
        }
        return this.$t('OPENPGPFILESWEBCLIENT.HINT_NOT_SIGN_FILE')
      }
      return this.$t('OPENPGPFILESWEBCLIENT.HINT_NOT_SIGN_FILE_REQUIRES_KEYBASED_ENCRYPTION')
    }
  },
  watch: {
    'shareableLinkParams.encryptionType'(type) {
      if (type === 'password') {
        this.shareableLinkParams.addDigitalSignature = false
      }
      if (type === 'key') {
        this.shareableLinkParams.addDigitalSignature = true
      }
    }
  },
  methods: {
    ...mapActions('filesmobile', ['getContactSuggestions']),
    async getContacts(params) {
      return await this.getContactSuggestions(params)
    },
    selectContact(contact) {
      this.shareableLinkParams.recipient = contact
      eventBus.$emit('CoreParanoidEncryptionWebclient::getShareableParams', this.shareableLinkParams)
      this.showSelectRecipientDialog = false
    },
    changeRecipient() {
      this.shareableLinkParams = {
        recipient: null,
        encryptionType: 'password',
        addDigitalSignature: false,
      }
      this.searchText = ''
      eventBus.$emit('CoreParanoidEncryptionWebclient::getShareableParams', this.shareableLinkParams)
    }
  },
}
</script>

<style lang="scss">
.inscription {
  font-size: 12px;
  line-height: 14px;

  color: #B6B5B5;
}
.header {
  margin-top: 24px;
  font-size: 14px;
  line-height: 16px;
  letter-spacing: 0.3px;
}
.separator {
  width: 100%;
  border: 1px solid #F6F6F6;
}

.contact-search .q-field__control {
  height: 36px;
  padding: 0 4px !important;
}
.recipient {
  margin-top: 32px;
  font-size: 14px;
  line-height: 16px;
  letter-spacing: 0.3px;
  color: #4B4A4A;
}
</style>
