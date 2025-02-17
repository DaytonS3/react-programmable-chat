import React, { Component } from "react";
import MessageForm from "./MessageForm";
import MessageList from "./MessageList";
import TwilioChat from "twilio-chat";
// import $ from "jquery";
import axios from "axios";
import "./App.css";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      username: null,
      channel: null
    };
  }

  componentDidMount = () => {
    this.getToken()
      .then(this.createChatClient)
      .then(this.joinGeneralChannel)
      .then(this.configureChannelEvents)
      .catch(error => {
        this.addMessage({ body: `Error: ${error.message}` });
      });
  };

  getToken = () => {
    return new Promise((resolve, reject) => {
      this.addMessage({ body: "Connecting..." });
      axios
        .post("http://localhost:5000/api/token")
        .then(res => {
          this.setState({
            username: res.data.identity
          });
          console.log(res);
          resolve(res.data.jwt);
        })
        .catch(err => console.log(err));
    });
  };

  createChatClient = token => {
    return new Promise((resolve, reject) => {
      console.log(token);
      resolve(new TwilioChat(token));
    });
  };

  joinGeneralChannel = chatClient => {
    return new Promise((resolve, reject) => {
      chatClient
        .getSubscribedChannels()
        .then(() => {
          chatClient
            .getChannelByUniqueName("general")
            .then(channel => {
              this.addMessage({ body: "Joining general channel..." });
              this.setState({ channel });

              channel
                .join()
                .then(() => {
                  this.addMessage({
                    body: `Joined general channel as ${this.state.username}`
                  });
                  window.addEventListener("beforeunload", () =>
                    channel.leave()
                  );
                })
                .catch(() => reject(Error("Could not join general channel.")));

              resolve(channel);
            })
            .catch(() => this.createGeneralChannel(chatClient));
        })
        .catch(() => reject(Error("Could not get channel list.")));
    });
  };

  createGeneralChannel = chatClient => {
    return new Promise((resolve, reject) => {
      this.addMessage({ body: "Creating general channel..." });
      chatClient
        .createChannel({ uniqueName: "general", friendlyName: "General Chat" })
        .then(() => this.joinGeneralChannel(chatClient))
        .catch(() => reject(Error("Could not create general channel.")));
    });
  };

  addMessage = message => {
    const messageData = {
      ...message,
      me: message.author === this.state.username
    };
    this.setState({
      messages: [...this.state.messages, messageData]
    });
  };

  handleNewMessage = text => {
    if (this.state.channel) {
      this.state.channel.sendMessage(text);
    }
  };

  configureChannelEvents = channel => {
    channel.on("messageAdded", ({ author, body }) => {
      this.addMessage({ author, body });
    });

    channel.on("memberJoined", member => {
      this.addMessage({ body: `${member.identity} has joined the channel.` });
    });

    channel.on("memberLeft", member => {
      this.addMessage({ body: `${member.identity} has left the channel.` });
    });
    channel.on("typingStarted", member => {
      this.addMessage({ body: `${member.identity} is currently typing.` });
    });
  };

  render() {
    return (
      <div className="App">
        <MessageList messages={this.state.messages} />
        <MessageForm onMessageSend={this.handleNewMessage} />
      </div>
    );
  }
}

export default App;
