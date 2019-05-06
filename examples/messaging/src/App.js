/* globals process */
import React, { Component } from 'react';
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  MessageList,
  MessageInput,
  MessageInputFlat,
  MessageSimple,
  ChannelHeader,
  ChannelPreviewMessenger,
  ChannelListMessenger,
  ChannelList,
  Window,
  Thread,
  InfiniteScrollPaginator,
  TypingIndicator,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';
import './App.css';

const urlParams = new URLSearchParams(window.location.search);
const user =
  urlParams.get('user') || process.env.REACT_APP_CHAT_API_DEFAULT_USER;
const theme = urlParams.get('theme') || 'light';
// const channelName = urlParams.get('channel') || 'demo';
const userToken =
  urlParams.get('user_token') ||
  process.env.REACT_APP_CHAT_API_DEFAULT_USER_TOKEN;

class App extends Component {
  constructor(props) {
    super(props);
    this.chatClient = new StreamChat(process.env.REACT_APP_CHAT_API_KEY);
    if (process.env.REACT_APP_CHAT_SERVER_ENDPOINT) {
      this.chatClient.setBaseURL(process.env.REACT_APP_CHAT_SERVER_ENDPOINT);
    }
    this.chatClient.setUser(
      {
        id: user,
      },
      userToken,
    );

    // const exampleVersion = 1;

    // this.channel = this.chatClient.channel('messaging', channelName, {
    //   image:
    //     'https://images.unsplash.com/photo-1512138664757-360e0aad5132?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2851&q=80',
    //   name: 'The water cooler',
    //   example: exampleVersion,
    // });
    // this.channel.watch();

    // for (let i = 0; i < 20; i++) {
    //   const channel = this.chatClient.channel('messaging', `aww-${i}`, {
    //     image:
    //       'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2855&q=80',
    //     name: `aww-${i}`,
    //     example: exampleVersion,
    //   });
    //   channel.watch();

    //   channel.sendMessage({ text: 'hello' });
    // }

    // const filters = { type: 'messaging', example: 1 };
    // const sort = { last_message_at: -1 };

    // this.channels = this.chatClient.queryChannels(filters, sort, {
    //   watch: true,
    //   limit: 5,
    //   offset: 0,
    // });

    // this.state = {
    //   channels: this.channels,
    // };
  }

  render() {
    const filters = { type: 'messaging', example: 1 };
    const sort = { last_message_at: -1 };
    const options = {
      watch: true,
      limit: 1,
    };
    return (
      <Chat
        client={this.chatClient}
        // channels={this.state.channels}
        filters={filters}
        sort={sort}
        options={options}
        theme={`messaging ${theme}`}
      >
        <ChannelList
          List={ChannelListMessenger}
          Preview={ChannelPreviewMessenger}
          Paginator={(props) => <InfiniteScrollPaginator {...props} />}
        />
        <Channel>
          <Window>
            <ChannelHeader />
            <MessageList TypingIndicator={TypingIndicator} />
            <MessageInput Input={MessageInputFlat} focus />
          </Window>
          <Thread Message={MessageSimple} />
        </Channel>
      </Chat>
    );
  }
}

export default App;
