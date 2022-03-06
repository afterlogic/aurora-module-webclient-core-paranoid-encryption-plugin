<template>
  <div>
    <div v-if="shareableLinkParams.recipient">
      <div class="dialog__title-text q-mx-md" @click="test">
        <span>
          {{ $t('OPENPGPFILESWEBCLIENT.HEADING_CREATE_PUBLIC_LINK') }}
        </span>
      </div>
      <div>

      </div>
      <app-contact-item @click="changeRecipient" class="q-py-md q-mx-md" :contact="shareableLinkParams.recipient"/>
      <div class="q-px-md">
        <span class="inscription">
          Selected recipient has PGP key. The data can be encrypted using this key.
        </span>
      </div>
      <div class="header q-mx-md">
        <span>Encryption type</span>
      </div>
      <div class="q-mx-xs q-mt-md">
        <q-option-group
            v-model="shareableLinkParams.encryptionType"
            keep-color
            size="32px"
            :options="encryptOptions"
            type="radio"
        />
      </div>
      <div class="separator q-mt-md"/>
      <div class="q-ma-md">
        <span class="inscription">{{ $t('OPENPGPFILESWEBCLIENT.HINT_KEY_BASED_ENCRYPTION') }}</span>
      </div>
      <div class="q-mx-md">
        <app-checkbox
            v-model="shareableLinkParams.addDigitalSignature"
            :leftLabel="true"
            :label="$t('OPENPGPFILESWEBCLIENT.LABEL_SIGN')"
        />
      </div>
      <div class="q-ma-md inscription">
        <span>
          {{ inscription }}
        </span>
      </div>
    </div>
    <div v-else>
      <div class="q-px-md dialog__title-text">
        <span>
          {{ $t('OPENPGPFILESWEBCLIENT.HEADING_SEND_ENCRYPTED_FILE') }}
        </span>
      </div>
      <div class="q-px-md" style="margin-top: 32px">
        <div v-if="isWaitingContacts" class="flex items-center justify-center">
          <q-circular-progress
              indeterminate
              size="40px"
              color="primary"
              class="q-ma-md"
          />
        </div>
        <q-scroll-area v-else class="full-width" :thumb-style="{width: '0'}" style="height: 300px">
          <app-contact-item
              v-for="contact in contacts"
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
    contacts: []
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
    }
  },
}
</script>

<style lang="scss" scoped>
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
</style>
