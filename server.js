var express = require("express")
var app = express()
var fs = require("fs")
var crypto = require("crypto")
var path = require("path")
var {MongoClient, ObjectId} = require("mongodb")

var client = new MongoClient("")
var public_html = path.join(__dirname, "public_html")

// might remove this
function loadUsers(){
    try{
        var content = fs.readFileSync("users.txt",{"encoding":"utf-8"})
        var lst = content.splot("\n")
        var returnList = []
        for (var i = 0; i<lst.length-1; i++){
            var user = lst[i].split(",")
            //  i need to work on how to use the cart and whether to store it like this
            var userObj = {"userId":user[0], "userName": user[1], "password": user[2], "usertype":user[3], "cart":users[4]}
            returnList.push(userObj)
        }
    }catch(err){
        console.log(err)
        return []
    }
}
var userList = loadUsers()

function checkLogin(username, password){
    for (var i = 0; i<userList.length; i++){
        var user = userList[i]
        var hashedPass = crypto.createHash("sha256").update(password).digest("hex")
        if(user.username == username && user.password==hashedPass && user.userId == userId){
            return true
        }
    }
    return false
}
function checkAdmin(username){
    for(var i = 0; i<userList.length; i++){
        var user = userList[i]
        if(user.username == username && user.usertype=="admin"){
            return true
        }
    }
    return false
}
app.get("/", function(req, res){
    res.sendFile(path.join(public_html, "index.html"))
})

// main page for both user and admin
// wenging work on the admin section
app.post("/home", express.json(), function(req, res){
    if (checkAdmin(req.body.username)){
        // need to work on this
        res.sendFile(path.join(public_html, "home_admin.html"))
    }
    else{
        res.sendFile(path.join(public_html, "index.html"))
    }
})

// for creating user or user sign up
app.post("/create_user", express.json(), function(req, res){
    res.sendFile(path.join(public_html, "userSignUp.html"))
})

// this is the add products we can remove this if worked on 
app.post("/manage", express.json(), function(req, res){
    if(checkAdmin(req.body.username)){
        res.sendFile(public_html, "manage.html")
    }
})

app.post("/signup", express.urlencoded(), function(req, res){
    var hashedPass = crypto.createHash("sha256").update(req.body.password).digest("hex")
    var id = crypto.randomUUID();
    var userObj = {"userId": id,"username":req.body.username, "password":hashedPass, "usertype":req.body.usertype, "cart": []}
    userList.push(userObj)
    console.log("User Id:", id, " created, user number: ", userList.length)
    try{
        var content = `${req.body.username}, ${hashedPass}, ${req.body.usertype}\n`
        fs.appendFileSync("users.txt", content, {"encoding": "utf-8"})
    }catch{
        console.log(err)
    }
    res.sendFile(path.join(public_html), "created_notification.html")
})