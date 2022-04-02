<template>
  <app-dialog :close="cancelDialog">
    <template v-slot:title>
      <div v-if="currentFile && (!currentFile.paranoidKey || currentFile.publicLink)">
        <div v-if="!currentFile.publicLink">
            <span>{{
                $t('OPENPGPFILESWEBCLIENT.HEADING_CREATE_PUBLIC_LINK')
              }}</span>
        </div>
        <div v-if="currentFile.publicLink">
              <span>{{
                  currentFile.linkPassword ? 'Protected public link' : $t('FILESWEBCLIENT.LABEL_PUBLIC_LINK')
                }}</span>
        </div>
      </div>
      <div v-else class="q-mb-lg">
        <span>
          {{ $t('OPENPGPFILESWEBCLIENT.HEADING_SEND_ENCRYPTED_FILE') }}
        </span>
      </div>
    </template>
    <template v-slot:content>
      <div v-if="currentFile && !showSelectRecipient && (!currentFile.paranoidKey || currentFile.publicLink)">
        <div v-if="!currentFile.publicLink">
          <app-checkbox
              class="q-pl-lg q-py-lg q-pr-md"
              v-model="withPassword"
              leftLabel
              label="Protect public link with password"
          />
        </div>
        <div v-if="currentFile.publicLink">
          <div class="q-px-lg">
            <div v-if="recipient" @click="selectRecipient" class="q-mt-lg">
              <div class="q-mb-sm recipient">
                <span>{{ $t('OPENPGPFILESWEBCLIENT.LABEL_RECIPIENT') }}:</span>
              </div>
              <app-contact-item :contact="recipient"/>
            </div>
            <div class="q-mb-md q-mt-lg" @click.stop="copyText(currentFile.publicLink, $t('FILESWEBCLIENT.LABEL_PUBLIC_LINK'))">
              <div class="q-mb-sm field__title">Link text</div>
              <div class="flex no-wrap">
                <div class="flex justify-center items-center q-mr-sm">
                  <copy-icon/>
                </div>
                <div class="text__caption flex items-center">
                  <span>{{ currentFile.publicLink }}</span>
                </div>
              </div>
            </div>
            <div
                v-if="currentFile.linkPassword"
                @click.stop="copyText(currentFile.linkPassword, $t('COREWEBCLIENT.LABEL_PASSWORD'))"
            >
              <div class="q-mb-sm field__title">{{ $t('COREWEBCLIENT.LABEL_PASSWORD') }}</div>
              <div class="flex no-wrap">
                <div class="q-mt-xs q-mr-sm">
                  <copy-icon/>
                </div>
                <div class="text__caption flex items-center">
                  <span>{{ currentFile.linkPassword }}</span>
                </div>
              </div>
            </div>
            <div v-if="currentFile.linkPassword" class="q-my-md">
                <span class="inscription">
                  {{$t('OPENPGPFILESWEBCLIENT.HINT_STORE_PASSWORD')}}
                </span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="currentFile && !showSelectRecipient && currentFile.paranoidKey && !currentFile.publicLink">
        <encrypted-shareable-link-head :recipient="recipient"  @selectRecipient="selectRecipient"/>
      </div>
      <app-select-recipient
          v-if="showSelectRecipient"
          :getContactsParameters="getContactsParameters"
          :onGetContacts="getContacts"
          @selectContact="selectContact"
      />
    </template>
    <template v-if="!showSelectRecipient" v-slot:actions>
      <div v-if="currentFile && (!currentFile.paranoidKey || currentFile.publicLink)" class="full-width q-mx-lg q-mb-sm">
        <div v-if="!currentFile.publicLink" class="flex justify-end q-pr-sm">
          <button-dialog
              :saving="saving"
              :action="createShareableLink"
              :label="createBtnLabel"
          />
        </div>
        <div v-if="currentFile.publicLink" :class="`full-width flex ${isCreatingLink ? 'justify-end' : 'justify-between'} q-px-sm`">
          <button-dialog
              v-if="!isCreatingLink"
              :saving="saving"
              :action="removeLink"
              :label="$t('FILESWEBCLIENT.ACTION_REMOVE_PUBLIC_LINK')"
          />
          <button-dialog
              :disabled="recipient.empty || (isCreatingLink && !recipient?.HasPgpPublicKey && currentFile.linkPassword)"
              :saving="saving"
              :action="sendViaMessage"
              :label="isCreatingLink ? sendLabel : $t('OPENPGPFILESWEBCLIENT.ACTION_SEND_EMAIL')"
          />
        </div>
      </div>
      <div v-else>
        <EncryptedShareableLinkActions :recipient="recipient"/>
      </div>
    </template>
  </app-dialog>
</template>

<script>

import AppDialog from "src/components/common/AppDialog";
import ButtonDialog from "src/components/common/ButtonDialog";
import AppContactItem from "src/components/common/AppContactItem";
import CopyIcon from "../../../../../FilesMobileWebclient/vue-mobile/components/icons/CopyIcon";
import AppCheckbox from "../../../../../CoreMobileWebclient/vue-mobile/src/components/common/AppCheckbox";
import { mapGetters, mapActions } from 'vuex'
import AppSelectRecipient from "src/components/common/AppSelectRecipient";
import EncryptedShareableLinkActions from "./encrypted-shareable-link/EncryptedShareableLinkActions";
import EncryptedShareableLinkHead from "./encrypted-shareable-link/EncryptedShareableLinkHead";
import notification from "src/utils/notification";


export default {
  name: "EncryptedShareableLinkDialog",
  components: {
    AppDialog,
    ButtonDialog,
    AppContactItem,
    CopyIcon,
    AppCheckbox,
    AppSelectRecipient,
    EncryptedShareableLinkActions,
    EncryptedShareableLinkHead
  },
  data: () => ({
    withPassword: false,
    openDialog: false,
    saving: false,
    publicLink: '',
    linkPassword: '',
    resultingComponents: null,
    recipient: { FullName: 'Not Selected', empty: true },
    isCreatingLink: false,
    showSelectRecipient: false,
    sendLinkLabel: '',
    isRecipientDisabled: false,
    getContactsParameters: {
      Search:'',
      Storage:'all',
      SortField:3,
      SortOrder:1,
      WithGroups:false,
      WithoutTeamContactsDuplicates:true
    }
  }),
  computed: {
    ...mapGetters('filesmobile', ['currentFile']),
    sendLabel() {
      return 'sendLabel'
    },
    createBtnLabel() {
      return this.withPassword
          ? 'Create protected link'
          : 'Create shareable link'
    },
  },
  methods: {
    ...mapActions('filesmobile', ['getContactSuggestions', 'asyncCreateShareableLink', 'asyncDeletePublicLink']),
    cancelDialog() {
      if (this.showSelectRecipient) {
        this.showSelectRecipient = false
      } else {
        this.$emit('closeDialog')
      }
    },
    selectRecipient() {
      if (!this.isRecipientDisabled) {
        this.showSelectRecipient = true
      }
    },
    copyText(text, valueName) {
      navigator.clipboard.writeText(text).then(() => {
        notification.showReport(
            `The ${valueName} has been copied to the clipboard.`
        )
      })
    },
    async createShareableLink() {
      await this.asyncCreateShareableLink({ withPassword: this.withPassword })
      this.publicLink = this.currentFile.publicLink
      this.linkPassword = this.currentFile.linkPassword
    },
    async removeLink() {
      this.saving = true
      const result = await this.asyncDeletePublicLink()
      this.saving = false
      if (result) this.$emit('closeDialog')
    },
    sendViaMessage() {
      console.log('coming soon')
    },
    async getContacts(params) {
      return await this.getContactSuggestions(params)
    },
    selectContact(contact) {
      this.recipient = contact
      this.showSelectRecipient = false
    }
  }
}
</script>

<style scoped>
.field__title {
  font-style: normal;
  font-weight: normal;
  font-size: 14px;
  line-height: 16px;
  letter-spacing: 0.3px;
}
.recipient {
  margin-top: 32px;
  font-size: 14px;
  line-height: 16px;
  letter-spacing: 0.3px;
  color: #4B4A4A;
}
.inscription {
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  color: #B6B5B5;
}
</style>
