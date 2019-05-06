import React, { Component } from 'react';

import { MessageSimple } from './MessageSimple';
import PropTypes from 'prop-types';
import { Attachment } from './Attachment';

import deepequal from 'deep-equal';
// import diff from 'shallow-diff';

/**
 * Message - A high level component which implements all the logic required for a message.
 * The actual rendering of the message is delegated via the "Message" property
 *
 * @example ./docs/Message.md
 * @extends Component
 */
export class Message extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  static propTypes = {
    /** The message object */
    message: PropTypes.object.isRequired,
    /** The client connection object for connecting to Stream */
    client: PropTypes.object.isRequired,
    /** The current channel this message is displayed in */
    channel: PropTypes.object.isRequired,
    /** A list of users that have read this message **/
    readBy: PropTypes.array,
    /** groupStyles, a list of styles to apply to this message. ie. top, bottom, single etc */
    groupStyles: PropTypes.array,
    /** Editing, if the message is currently being edited */
    editing: PropTypes.bool,
    /** The message rendering component, the Message component delegates its rendering logic to this component */
    Message: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
    /** Allows you to overwrite the attachment component */
    Attachment: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
    /** render HTML instead of markdown. Posting HTML is only allowed server-side */
    unsafeHTML: PropTypes.bool,
  };

  static defaultProps = {
    Message: MessageSimple,
    readBy: [],
    groupStyles: [],
    Attachment,
    editing: false,
  };

  shouldComponentUpdate(nextProps) {
    // since there are many messages its important to only rerender messages when needed.
    let shouldUpdate = nextProps.message !== this.props.message;
    let reason = '';
    if (shouldUpdate) {
      reason = 'message';
    }
    // read state is the next most likely thing to change..
    if (!shouldUpdate && !deepequal(nextProps.readBy, this.props.readBy)) {
      shouldUpdate = true;
      reason = 'readBy';
    }
    // group style often changes for the last 3 messages...
    if (
      !shouldUpdate &&
      !deepequal(nextProps.groupStyles, this.props.groupStyles)
    ) {
      shouldUpdate = true;
      reason = 'groupStyles';
    }

    // if lastreceivedId changesm, message should update.
    if (
      !shouldUpdate &&
      !deepequal(nextProps.lastReceivedId, this.props.lastReceivedId)
    ) {
      shouldUpdate = true;
      reason = 'lastReceivedId';
    }

    // editing is the last one which can trigger a change..
    if (!shouldUpdate && nextProps.editing !== this.props.editing) {
      shouldUpdate = true;
      reason = 'editing';
    }

    // editing is the last one which can trigger a change..
    if (
      !shouldUpdate &&
      nextProps.messageListRect !== this.props.messageListRect
    ) {
      shouldUpdate = true;
      reason = 'messageListRect';
    }

    if (shouldUpdate && reason) {
      // console.log(
      //   'message',
      //   nextProps.message.id,
      //   'shouldUpdate',
      //   shouldUpdate,
      //   reason,
      // );
      // console.log(reason, diff(this.props, nextProps));
    }

    return shouldUpdate;
  }

  isMyMessage = (message) => this.props.client.user.id === message.user.id;
  isAdmin = () => this.props.client.user.role === 'admin';

  canEditMessage = (message) => this.isMyMessage(message) || this.isAdmin();

  canDeleteMessage = (message) => this.isMyMessage(message) || this.isAdmin();

  handleFlag = async (event) => {
    event.preventDefault();

    const message = this.props.message;
    await this.props.client.flagMessage(message.id);
  };

  handleMute = async (event) => {
    event.preventDefault();

    const message = this.props.message;
    await this.props.client.flagMessage(message.user.id);
  };

  handleEdit = () => {
    this.props.setEditingState(this.props.message);
  };

  handleDelete = async (event) => {
    event.preventDefault();
    const message = this.props.message;
    const data = await this.props.client.deleteMessage(message.id);
    this.props.updateMessage(data.message);
  };

  handleReaction = async (reactionType, event) => {
    if (event !== undefined && event.preventDefault) {
      event.preventDefault();
    }

    let userExistingReaction = null;

    const currentUser = this.props.client.userID;

    for (const reaction of this.props.message.own_reactions) {
      // own user should only ever contain the current user id
      // just in case we check to prevent bugs with message updates from breaking reactions
      if (currentUser === reaction.user.id && reaction.type === reactionType) {
        userExistingReaction = reaction;
      } else if (currentUser !== reaction.user.id) {
        console.warn(
          `message.own_reactions contained reactions from a different user, this indicates a bug`,
        );
      }
    }

    const originalMessage = this.props.message;
    let reactionChangePromise;

    /*
    - Add the reaction to the local state
    - Make the API call in the background
    - If it fails, revert to the old message...
     */
    if (userExistingReaction) {
      this.props.channel.state.removeReaction(userExistingReaction);

      reactionChangePromise = this.props.channel.deleteReaction(
        this.props.message.id,
        userExistingReaction.type,
      );
    } else {
      // add the reaction
      const messageID = this.props.message.id;
      const tmpReaction = {
        message_id: messageID,
        user: this.props.client.user,
        type: reactionType,
        created_at: new Date(),
      };
      const reaction = { type: reactionType };

      this.props.channel.state.addReaction(tmpReaction);
      reactionChangePromise = this.props.channel.sendReaction(
        messageID,
        reaction,
      );
    }

    try {
      // only wait for the API call after the state is updated
      await reactionChangePromise;
    } catch (e) {
      // revert to the original message if the API call fails
      this.props.updateMessage(originalMessage);
    }
  };

  handleAction = async (name, value, event) => {
    event.preventDefault();
    const messageID = this.props.message.id;
    const formData = {};
    formData[name] = value;

    const data = await this.props.channel.sendAction(messageID, formData);

    if (data && data.message) {
      this.props.updateMessage(data.message);
    } else {
      this.props.removeMessage(this.props.message);
    }
  };

  handleRetry = async (message) => {
    await this.props.retrySendMessage(message);
  };

  onMentionsClick = (e) => {
    this.props.onMentionsClick(e, this.props.message.mentioned_users);
  };
  onMentionsHover = (e) => {
    this.props.onMentionsHover(e, this.props.message.mentioned_users);
  };

  render() {
    const message = this.props.message;

    const actionsEnabled =
      message.type === 'regular' && message.status === 'received';

    const Component = this.props.Message;
    return (
      <Component
        {...this.props}
        actionsEnabled={actionsEnabled}
        Message={this}
        handleReaction={this.handleReaction}
        handleFlag={this.handleFlag}
        handleMute={this.handleMute}
        handleAction={this.handleAction}
        handleReply={this.handleReply}
        handleRetry={this.handleRetry}
        isMyMessage={this.isMyMessage}
        openThread={
          this.props.openThread && this.props.openThread.bind(this, message)
        }
        onMentionsClickMessage={this.onMentionsClick}
        onMentionsHoverMessage={this.onMentionsHover}
      />
    );
  }
}
