<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-file.svg', alt='Page', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft Reviews
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s Manage page content reviews
          v-spacer
        v-card.mt-3.animated.fadeInUp
          .pa-2.d-flex.align-center(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-3`')
            v-text-field(
              solo
              flat
              v-model='search'
              prepend-inner-icon='mdi-file-search-outline'
              label='Search Pages...'
              hide-details
              dense
              style='max-width: 400px;'
              )
            v-spacer
            v-select.ml-2(
              solo
              flat
              hide-details
              dense
              label='Not Reviewed'
              :items='review'
              v-model='selectedReview'
              style='max-width: 250px;'
            )
            v-spacer
            //- v-select.ml-2(
            //-   solo
            //-   flat
            //-   hide-details
            //-   dense
            //-   label='Review status'
            //-   :items='states'
            //-   v-model='selectedState'
            //-   style='max-width: 250px;'
            //- )
          v-divider
          v-data-table(
            :items='filteredPages'
            :headers='headers'
            :search='search'
            :page.sync='pagination'
            :items-per-page='15'
            :loading='loading'
            must-sort,
            sort-by='updatedAt',
            sort-desc,
            hide-default-footer
          )
            template(slot='item', slot-scope='props')
              tr.is-clickable(:active='props.selected', @click='goHistory(props.item.path, props.item.versionId)')
                td.text-xs-right {{ props.item.pageId }}
                td
                  .body-2: strong {{ props.item.title }}
                  .caption {{ props.item.description }}
                td.admin-pages-path
                  v-chip(label, small, :color='$vuetify.theme.dark ? `grey darken-4` : `grey lighten-4`') {{ props.item.localeCode }}
                  span.ml-2.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-2`') / {{ props.item.path }}
                td {{ props.item.versionDate | moment('calendar') }}
                td {{ props.item.authorName }}
                td {{ props.item.isReviewed }}
                td {{ props.item.isApproved }}
            template(slot='no-data')
              v-alert.ma-3(icon='mdi-alert', :value='true', outlined) No pages to display.
          .text-center.py-2.animated.fadeInDown(v-if='this.pageTotal > 1')
            v-pagination(v-model='pagination', :length='pageTotal')
</template>

<script>

import _ from 'lodash'

import gql from 'graphql-tag'
export default {
  data() {
    return {
      selectedPage: {},
      pagination: 1,
      pages: [],
      headers: [
        { text: 'ID', value: 'pageId', width: 30, sortable: true },
        { text: 'Title', value: 'title', width: 100 },
        { text: 'Path', value: 'path', width: 200 },
        { text: 'Created', value: 'versionDate', width: 140 },
        { text: 'Creator Name', value: 'authorName', width: 100 },
        { text: 'Review', value: 'isReviewed', width: 50 },
        { text: 'States', value: 'isApproved', width: 50 }
      ],
      search: '',
      selectedLang: null,
      selectedReview: false,
      selectedState: null,
      review: [
        // { text: 'All Reviews', value: null },
        // { text: 'Reviewed', value: true },
        { text: 'Not Reviewed', value: false }

      ],
      // states: [
      //   { text: 'Review status', value: null },
      //   { text: 'Approved Review', value: true },
      //   { text: 'Rejected Review', value: false }
      // ],
      loading: false
    }
  },
  computed: {
    pageTotal () {
      return Math.ceil(this.filteredPages.length / 15)
    },
    filteredPages () {
      return _.filter(this.pages, pg => {
        if (this.selectedReview !== null && this.selectedReview !== pg.isReviewed) {
          return false
        }
        if (this.selectedState !== null && this.selectedState !== pg.isApproved) {
          return false
        }
        return true
      })
    },
    langs () {
      return _.concat({
        text: 'All Locales',
        value: null
      }, _.uniqBy(this.pages, 'locale').map(pg => ({
        text: pg.locale,
        value: pg.locale
      })))
    }
  },
  mounted () {
    this.$root.$on('pageEdit', () => {
      this.pageEdit()
    })
    this.$root.$on('pageHistory', () => {
      this.pageHistory()
    })
  },
  methods: {
    async refresh() {
      await this.$apollo.queries.pages.refetch()
      this.$store.commit('showNotification', {
        message: 'Page list has been refreshed.',
        style: 'success',
        icon: 'cached'
      })
    },
    toggleModal(key) {
      this.activeModal = (this.activeModal === key) ? '' : key
      this.helpShown = false
    },
    closeAllModal() {
      this.activeModal = ''
      this.helpShown = false
    },
    openPageReview() {
      this.toggleModal(`editorModalConflict`)
    },

    goHistory (pagePath, versionId) {
      window.location.assign(`/r/en/${pagePath}/${versionId}`)
    },

    newpage() {
      this.pageSelectorShown = true
    },
    recyclebin () { }
  },
  apollo: {
    trail: {
      query: gql`
        query($offsetPage: Int, $offsetSize: Int) {
          pages {
            reviewHistory(offsetPage:$offsetPage, offsetSize:$offsetSize) {
              trail {
                versionId
                authorId
                authorName
                actionType
                valueBefore
                valueAfter
                versionDate
                content
                newContent
                title
                path
                createdAt
                pageId
                localeCode
                isApproved
                isReviewed
              }
              total
            }
          }
        }
      `,
      variables () {
        return {
          offsetPage: 0,
          offsetSize: this.$vuetify.breakpoint.mdAndUp ? 500 : 500
        }
      },
      manual: true,
      result ({ data, loading, networkStatus }) {
        // this.total = data.pages.history.total
        // this.trail = data.pages.history.trail
        this.pages = data.pages.reviewHistory.trail
      },
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'history-trail-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.admin-pages-path {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-family: 'Roboto Mono', monospace;
}
</style>
