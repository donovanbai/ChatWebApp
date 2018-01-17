import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      room: -1,
      roomField: '',
      connection: null
    };
  }
  
  render() {
    let roomText = this.state.room === -1? '' : 'room: ' + this.state.room;
    return (
      <div>
        <button id='createBtn' onClick={this.handleCreateClick.bind(this)}>Create New Room</button><br/>
        <input type='text' id='roomField' value={this.state.roomField} onChange={this.handleChange.bind(this)} onKeyPress={this.handleKeyPress.bind(this)}/>
        <button id='joinBtn' onClick={this.handleJoinClick.bind(this)}>Join Room</button>
        {roomText}
        <Chatbox connection={this.state.connection}/>
      </div>
    );
  }
  
  handleChange(e) {
    this.setState({roomField: e.target.value});
  }
  
  handleCreateClick() {
    fetch('/create')
      .then(res => res.json())
      .then(resJson => {
        if (this.state.connection) {
          this.state.connection.close();
        }
        this.setState({room: resJson.num});
        let connection = new WebSocket('ws://localhost:3001/ws/' + resJson.num);
        this.setState({connection});
      });
    
  }
  
  handleJoinClick() { // TODO
  if (this.state.roomField === '') {
    alert('Enter a room number');
    return
  }
	if (isNaN(this.state.roomField)) {
		alert('Room must be a number');
		return;
	}
	fetch('/join/' + this.state.roomField)
		.then(res => res.json())
		.then(resJson => {
			if (resJson.accept) {
        if (this.state.connection) {
          this.state.connection.close();
        }
				this.setState({room: this.state.roomField});	
				let connection = new WebSocket('ws://localhost:3001/ws/' + this.state.roomField);
				this.setState({connection: connection, roomField: ''});
			}
			else {
				alert('Join room failed');
			}
		});
  }
  
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.handleJoinClick();
    }
  }
}

class Chatbox extends React.Component {
  constructor() {
    super();
    this.state = {
      messages: [],
      currMsg: ''
    };
  }
  
  render() {
    if (this.props.connection !== null) {
      this.props.connection.onmessage = function(evt) {
        this.setState({messages: messages.concat(evt.data)});
      }.bind(this);
    }
    let messages = this.state.messages;
    let convo = messages.map((message, i) => {
      return (
        <p key={i}>{message}</p> 
        // we don't need to re-order messages and we only insert new 
        // messages at the end of the array so using index as key here is fine
      );
    });
    return (
      <div>
        <div id='chatbox'>
          {convo}
        </div>
        <input type='text' id='msgField' value={this.state.currMsg} onChange={this.handleChange.bind(this)} onKeyPress={this.handleKeyPress.bind(this)} disabled={this.props.connection === null} />
        <input type='submit' id='submitMsg' value='Enter' onClick={this.handleClick.bind(this)} disabled={this.props.connection === null} />
      </div>
    );
  }
  
  handleChange(e) {
    this.setState({currMsg: e.target.value});
  }
  
  handleClick() {
    if (this.props.connection !== null) {
      this.props.connection.send(this.state.currMsg);
      this.setState({currMsg: ''});
    }
  }
  
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.handleClick();
    }
  }
}

// ========================================

ReactDOM.render(
<App />,
    document.getElementById('root')
);
