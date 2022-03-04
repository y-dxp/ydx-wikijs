const _ = require('lodash')
const graphHelper = require('../../helpers/graph')

/* global WIKI */

module.exports = {
  Query: {
    async mail() { return {} }
  },
  Mutation: {
    async mail() { return {} }
  },
  MailQuery: {
    async config(obj, args, context, info) {
      return {
        ...WIKI.config.mail,
        pass: WIKI.config.mail.pass.length > 0 ? '********' : ''
      }
    }
  },
  MailMutation: {
    async sendTest(obj, args, context) {
      try {
        if (_.isEmpty(args.recipientEmail) || args.recipientEmail.length < 6) {
          throw new WIKI.Error.MailInvalidRecipient()
        }

        await WIKI.mail.send({
          template: 'test',
          to: args.recipientEmail,
          subject: 'A test email from your wiki',
          data: {
            preheadertext: 'This is a test email sent from your wiki.'
          }
        })

        return {
          responseResult: graphHelper.generateSuccess('Test email sent successfully.')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async reviewEmail(obj, args, context) {
      let currentpageId = args.pageId
      let preheader, title, pagePath, pageAuthor
      let editorUsersIds = []
      let editorUsersEmail = []
      let usersEmail = []
      let editorGroupId = await WIKI.models.groups.query().where('name', 'Editor').first()
      let editorUserListIds = await WIKI.models.userGroups.getGroupUsersFromDb(editorGroupId.id)

      editorUserListIds.forEach(editorUser => {
        editorUsersIds.push(editorUser.userId)
      })

      let editorUsersEmailDetailList = await WIKI.models.users.query().whereIn('id', editorUsersIds)

      editorUsersEmailDetailList.forEach(editorUser => {
        editorUsersEmail.push(editorUser.email)
      })

      let uniqEditorUsersEmail = [...new Set(editorUsersEmail)]

      if (args.context === 'pageSubmitForReview') {
        preheader = 'You have received this email because a review has been submitted for page creation.'
        title = 'Page creation review request'
        let page = await WIKI.models.pages.getPageFromDb(currentpageId)
        pagePath = page.path
        usersEmail = [...uniqEditorUsersEmail]
        usersEmail.push(page.creatorEmail)
        pageAuthor = page.creatorEmail
        try {
          if (usersEmail.length === 0) {
            throw new WIKI.Error.MailInvalidRecipient()
          }
          let path = `${WIKI.config.host}/e/en/${pagePath}`
          for (let i = 0; i < usersEmail.length; i++) {
            WIKI.mail.send({
              template: 'reviewemail',
              to: usersEmail[i],
              subject: title,
              text: title,
              msg: title,
              data: {
                user: _.startCase(_.toLower(usersEmail[i].split('@')[0].split('.')[0])),
                preheadertext: preheader,
                content: `Click the button below to navigate to the page.`,
                author: pageAuthor,
                buttonLink: path,
                buttonText: 'Page'
              }
            })
          }

          return {
            responseResult: graphHelper.generateSuccess('Email sent successfully.')
          }
        } catch (err) {
          return graphHelper.generateError(err)
        }
      } else {
        preheader = 'You have received this email because a review has been submitted for page modification.'
        title = 'Page edit review request'
        usersEmail = [...uniqEditorUsersEmail]
        const pageHistoryUsers = await WIKI.models.pageHistory.query()
          .where({
            'pageHistory.pageId': currentpageId,
            'pageHistory.isReviewed': false
          })

        let latestPageHistory, versionId

        if (pageHistoryUsers.length > 0) {
          latestPageHistory = pageHistoryUsers.pop()
          versionId = latestPageHistory.id
        }
        pagePath = latestPageHistory.path
        const historyUsersEmail = await WIKI.models.users.query().where('id', latestPageHistory.authorId).first()
        usersEmail.push(historyUsersEmail.email)
        pageAuthor = historyUsersEmail.email

        try {
          if (usersEmail.length === 0) {
            throw new WIKI.Error.MailInvalidRecipient()
          }
          let path
          for (let i = 0; i < usersEmail.length; i++) {
            if (historyUsersEmail.email === usersEmail[i]) {
              path = `${WIKI.config.host}/e/en/${pagePath}`
            } else {
              path = `${WIKI.config.host}/r/en/${pagePath}/${versionId}`
            }

            WIKI.mail.send({
              template: 'reviewemail',
              to: usersEmail[i],
              subject: title,
              text: title,
              msg: title,
              data: {
                user: _.startCase(_.toLower(usersEmail[i].split('@')[0].split('.')[0])),
                preheadertext: preheader,
                content: `Click the button below to navigate to the page.`,
                author: pageAuthor,
                buttonLink: path,
                buttonText: 'Page'
              }
            })
          }

          return {
            responseResult: graphHelper.generateSuccess('Email sent successfully.')
          }
        } catch (err) {
          return graphHelper.generateError(err)
        }
      }
    },
    async reviewedEmailbyAdmin(obj, args, context) {
      let currentpageId = args.pageId
      let isApprovedStatus = args.isApproved
      let template = ''
      let subject = ''
      let preheader = ''

      if (args.context === 'pageCreateReview') {
        if (isApprovedStatus === 'approve') {
          template = 'approvereviewemail'
          subject = 'Page creation review approved'
          preheader = `Thank you for submitting your page creation request.
          We are happy to inform you that we have approved and published the page.`
        } else {
          await WIKI.models.pages.query()
            .patch({
              isSubmit: false
            })
            .where({
              id: args.pageId
            })

          // -> Rebuild page tree
          await WIKI.models.pages.rebuildTree()

          template = 'rejectreviewemail'
          subject = 'Page creation review reject'
          preheader = `Thank you for submitting your page creation request.
          After careful consideration, we regret to inform you that we have declined to publish the page.
          Kindly revise the changes and submit again.`
        }
      } else {
        if (isApprovedStatus === 'approve') {
          template = 'approvereviewemail'
          subject = 'Page edit review approved'
          preheader = `Thank you for submitting your page edit for review.
          We are happy to inform you that we have approved and published the changes.`
        } else {
          template = 'rejectreviewemail'
          subject = 'Page edit review reject'
          preheader = `Thank you for submitting your page modification request.
          After careful consideration, we regret to inform you that we have declined to publish the changes.
          Kindly revise the changes and submit again.`
        }
      }

      let emailList = []
      let filterUserIds = []

      let page = await WIKI.models.pages.getPageFromDb(currentpageId)
      let pagePath = page.path
      let pageCreator = page.creatorEmail
      let pageSubmitterIds
      let pageSubmitterEmail

      const pageHistory = await WIKI.models.pageHistory.query()
        .where({
          'pageHistory.pageId': page.id
        })

      if (args.context === 'pageCreateReview') {
        pageSubmitterEmail = page.creatorEmail
      }
      for (let i = 0; i < pageHistory.length; i++) {
        if (pageHistory[i].id !== args.versionId) {
          filterUserIds.push(pageHistory[i].authorId)
        } else {
          pageSubmitterIds = pageHistory[i].authorId
        }
      }

      let editorGroupId = await WIKI.models.groups.query().where('name', 'Editor').first()

      let editorUserListIds = await WIKI.models.userGroups.getGroupUsersFromDb(editorGroupId.id)

      for (let i = 0; i < editorUserListIds.length; i++) {
        filterUserIds.push(editorUserListIds[i].userId)
      }

      let adminUserEmailList = await WIKI.models.users.query().whereIn('id', filterUserIds)

      if (pageSubmitterIds !== undefined) {
        let pageSubmitter = await WIKI.models.users.query().where('id', pageSubmitterIds).first()
        pageSubmitterEmail = pageSubmitter.email
      }

      for (let i = 0; i < adminUserEmailList.length; i++) {
        emailList.push(adminUserEmailList[i].email)
      }

      let uniqEmailList = [...new Set(emailList)]

      uniqEmailList.splice(uniqEmailList.indexOf(pageSubmitterEmail), 1)

      try {
        if (uniqEmailList.length === 0) {
          throw new WIKI.Error.MailInvalidRecipient()
        }
        await WIKI.mail.send({
          template: template,
          to: pageSubmitterEmail,
          subject: subject,
          data: {
            user: _.startCase(_.toLower(pageSubmitterEmail.split('@')[0].split('.')[0])),
            preheadertext: preheader,
            author: pageCreator,
            content: `Click the button below to navigate to the page.`,
            buttonLink: `${WIKI.config.host}/en/${pagePath}`,
            buttonText: 'Page'
          }
        })

        let approveStatue = isApprovedStatus === 'approve' ? 'approved' : 'rejected'
        for (let i = 0; i < uniqEmailList.length; i++) {
          await WIKI.mail.send({
            template: template,
            to: uniqEmailList[i],
            subject: subject,
            data: {
              user: _.startCase(_.toLower(uniqEmailList[i].split('@')[0].split('.')[0])),
              preheadertext: `The page modification request is ${approveStatue}.`,
              author: pageCreator,
              content: `Click the button below to navigate to the page.`,
              buttonLink: `${WIKI.config.host}/en/${pagePath}`,
              buttonText: 'Page'
            }
          })
        }

        return {
          responseResult: graphHelper.generateSuccess('Email sent successfully.')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },

    async updateConfig(obj, args, context) {
      try {
        WIKI.config.mail = {
          senderName: args.senderName,
          senderEmail: args.senderEmail,
          host: args.host,
          port: args.port,
          secure: args.secure,
          verifySSL: args.verifySSL,
          user: args.user,
          pass: (args.pass === '********') ? WIKI.config.mail.pass : args.pass,
          useDKIM: args.useDKIM,
          dkimDomainName: args.dkimDomainName,
          dkimKeySelector: args.dkimKeySelector,
          dkimPrivateKey: args.dkimPrivateKey
        }
        await WIKI.configSvc.saveToDb(['mail'])

        WIKI.mail.init()

        return {
          responseResult: graphHelper.generateSuccess('Mail configuration updated successfully.')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
