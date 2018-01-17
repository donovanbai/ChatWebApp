package main

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"time"
)

type Room struct {
	Num uint16 `json:"num"`
}

type JoinResponse struct {
	Accept bool `json:"accept"`
}

var connMap = make(map[*websocket.Conn]uint16)
var roomMap = make(map[uint16][]*websocket.Conn)

func main() {
	rand.Seed(time.Now().UnixNano())
	http.HandleFunc("/create", createHandler)
	http.HandleFunc("/join/", joinHandler)
	http.HandleFunc("/ws/", wsHandler)
	http.ListenAndServe(":3001", nil)
}

func createHandler(w http.ResponseWriter, r *http.Request) {
	num := uint16(rand.Int() % (1 << 16))
	for roomMap[num] != nil {
		num = uint16(rand.Int() % (1 << 16))
	}
	room := Room{num}
	json.NewEncoder(w).Encode(room)
}

func joinHandler(w http.ResponseWriter, r *http.Request) {
	roomNum, err := strconv.ParseInt(r.RequestURI[6:], 10, 0)
	if err != nil {
		fmt.Println("err:", err)
		resp := JoinResponse{false}
		json.NewEncoder(w).Encode(resp)
		return
	}
	if roomMap[uint16(roomNum)] == nil {
		fmt.Println("join room failed: room doesn't exist")
		resp := JoinResponse{false}
		json.NewEncoder(w).Encode(resp)
		return
	}
	resp := JoinResponse{true}
	json.NewEncoder(w).Encode(resp)
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	roomNum, err := strconv.ParseInt(r.RequestURI[4:], 10, 0)
	if err != nil {
		fmt.Println("err:", err)
		return
	}
	var upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		// need to override CheckOrigin because origin host
		// is different from the request host
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	// 2 maps for fast access
	// each connection is mapped to its associated room number
	// each room number is mapped to all associated connections
	connMap[conn] = uint16(roomNum)
	roomMap[uint16(roomNum)] = append(roomMap[uint16(roomNum)], conn)
	for {
		mt, message, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("err:", err)
			break;
		}
		fmt.Println("message type:", mt)
		fmt.Println("message:", string(message))
		for _, v := range roomMap[connMap[conn]] {
			v.WriteMessage(1, message) // TextMessage = 1
		}
	}
	// remove connection from both maps
	conn.Close()
	conns := roomMap[connMap[conn]]
	for i, v := range conns {
		if v == conn {
			// move the last connection in the slice to fill the
			// gap and shrink slice by 1
			conns[i] = conns[len(conns) - 1]
			roomMap[connMap[conn]] = conns[:len(conns) - 1]
			if len(roomMap[connMap[conn]]) == 0 {
				delete(roomMap, connMap[conn])
			}
			delete(connMap, conn)
			break
		}
	}
}