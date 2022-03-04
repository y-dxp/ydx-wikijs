<template lang='pug'>
  <div>test div</div>
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'
import { sync, get } from 'vuex-pathify'

/* global siteConfig */

// ========================================
// IMPORTS
// ========================================

import '../../libs/codemirror-merge/diff-match-patch.js'

// Code Mirror
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'

// Language
import 'codemirror/mode/markdown/markdown.js'
import 'codemirror/mode/htmlmixed/htmlmixed.js'

// Addons
import 'codemirror/addon/selection/active-line.js'
import 'codemirror/addon/merge/merge.js'
import 'codemirror/addon/merge/merge.css'

export default {
  data() {
    return {
      cm: null,
      latest: {
        title: '',
        description: '',
        updatedAt: '',
        authorName: ''
      },
      isRemoteConfirmDiagShown: true
    }
  },
  computed: {
    editorKey: get('editor/editorKey'),
    activeModal: sync('editor/activeModal'),
    pageId: get('page/id'),
    title: get('page/title'),
    description: get('page/description'),
    updatedAt: get('page/updatedAt'),
    checkoutDateActive: sync('editor/checkoutDateActive')
  },
  methods: {
    close () {
      this.isRemoteConfirmDiagShown = false
      this.activeModal = ''
    },
    overwriteAndClose() {
      this.checkoutDateActive = this.latest.updatedAt
      this.$root.$emit('overwriteEditorContent')
      this.$root.$emit('resetEditorConflict')
      this.close()
    },
    useLocal () {
      this.$store.set('editor/content', this.cm.edit.getValue())
      this.overwriteAndClose()
    },
    useRemote () {
      this.$store.set('editor/content', this.latest.content)
      this.overwriteAndClose()
    }
  },
  async mounted () {
    let textMode = 'text/html'

    switch (this.editorKey) {
      case 'markdown':
        textMode = 'text/markdown'
        break
    }

    let resp = await this.$apollo.query({
      query: gql`
        query ($id: Int!) {
          pages {
            conflictLatest(id: $id) {
              id
              authorId
              authorName
              content
              createdAt
              description
              isPublished
              locale
              path
              tags
              title
              updatedAt
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      variables: {
        id: this.$store.get('page/id')
      }
    })
    resp = _.get(resp, 'data.pages.conflictLatest', false)

    if (!resp) {
      return this.$store.commit('showNotification', {
        message: 'Failed to fetch latest version.',
        style: 'warning',
        icon: 'warning'
      })
    }
    this.latest = resp

    this.cm = CodeMirror.MergeView(this.$refs.cm, {
      value: this.$store.get('editor/content'),
      orig: resp.content,
      tabSize: 2,
      mode: textMode,
      lineNumbers: true,
      lineWrapping: true,
      connect: null,
      highlightDifferences: true,
      styleActiveLine: true,
      collapseIdentical: true,
      direction: siteConfig.rtl ? 'rtl' : 'ltr'
    })
    this.cm.rightOriginal().setSize(null, 'calc(100vh - 265px)')
    this.cm.editor().setSize(null, 'calc(100vh - 265px)')
    this.cm.wrap.style.height = 'calc(100vh - 265px)'
  }
}
</script>

<style lang='scss'>
.editor-modal-conflict {
  position: fixed !important;
  top: 0;
  left: 0;
  z-index: 10;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, .9) !important;
  overflow: auto;
}
</style>
