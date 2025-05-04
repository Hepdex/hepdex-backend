const { MongoClient } = require('mongodb');



class Database{
    constructor(){
        this.name = 'Hepdex';
        this.uri = process.env.DatabaseUri
        this.collections = {
            users: "users",
            admins: "admins",
            jobs: "jobs",
            jobApplications: "jobApplications"
            
        };
        this.db;
    }
    connect = (cb)=>{
        const client = new MongoClient(this.uri)
        client.connect()
        .then(()=>{
            console.log('connected to database')
            this.db = client.db(this.name)
            cb()
        })
        .catch(err=>{
             
            throw err
        })

    }
    getDatabase = ()=>{
        if(this.db){
            return this.db 
        }
        else{
            console.log('cant find database')
            const errorMsg = {msg: 'Unable to connect to database'}
            
            throw errorMsg   
        }
    }
    checkForExistingUser = async (data)=>{
        //extract all possible user collections
        const users = this.db.collection(this.collections.users)
        const existingUser = await users.findOne({email: data.email})

        if(existingUser){
            return {doesUserDetailExist: true, userDetail: "email"}
        }

        return {doesUserDetailExist: false}

    }
    findOne = (query, collectionName, projection = null, operation = null) =>{
        if(!projection){
            return this.getDatabase().collection(collectionName).findOne(query)
        }
        else{
            const project = {}
            for(const item of projection){
                project[item] = operation
            }
            return this.getDatabase().collection(collectionName).findOne(query, {projection: project})
        }
    }
    findMany = (query, collectionName, projection = null, operation = null) =>{
        if(!projection){
            return this.getDatabase().collection(collectionName).find(query)
        }
        else{
            const project = {}
            for(const item of projection){
                project[item] = operation
            }
            return this.getDatabase().collection(collectionName).find(query, {projection: project})
        }
    }
    deleteOne = (query, collectionName)=>{
        return this.getDatabase().collection(collectionName).deleteOne(query)
    }
    deleteMany = (query, collectionName)=>{
        return this.getDatabase().collection(collectionName).deleteMany(query)
    }
    insertOne = (data, collectionName)=>{
        return this.getDatabase().collection(collectionName).insertOne(data)
    }
    insertMany = (data, collectionName)=>{
        return this.getDatabase().collection(collectionName).insertMany(data)
    }
    updateOne = (query, collectionName, data)=>{
        return this.getDatabase().collection(collectionName).updateOne(query, {$set: data})

    }
    updateMany = (query, collectionName, data)=>{
        return this.getDatabase().collection(collectionName).updateMany(query, {$set: data})

    } 
}

const database = new Database()

module.exports = database