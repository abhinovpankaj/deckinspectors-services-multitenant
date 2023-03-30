"use strict";
var ObjectId = require('mongodb').ObjectId;
const { QueryCollectionFormat } = require('@azure/core-http');
const { JsonWebTokenError } = require('jsonwebtoken');
var mongo = require('../database/mongo');

var addLocation = async function (location) {
    var response ={};
    try {
        var result = await mongo.Locations.insertOne(location);
    
        if(result.insertedId){
            if(location.parentType=="subproject")             
                var projresult = await mongo.SubProjects.updateOne({_id:new ObjectId(location.parentId)},{ $push: { children: {"id":result.insertedId,"name":location.name,"type":"location"}}});     
            else
                var projresult = await mongo.Projects.updateOne({_id:new ObjectId(location.parentId)},{ $push: { children: {"id":result.insertedId,"name":location.name,"type":"location"}}});     
            
            if (projresult.modifiedCount>0)
            {
                var msg = "Location inserted successfully,parent  updated successfully."
            }
            else
                var msg = "Location inserted successfully,parent  failed to updated."
            
            response = {
                "data" :{
                    "id": result.insertedId,
                    "message":msg,
                    "code":201
                }   
            }
        }
        else{
            response = {
                "error": {
                    "code": 500,
                    "message": "No Location inserted."
                }
            } 
        }
        return response;
    } catch (error) {
        
    }
    
};


var getLocationById = async function (id) { 
    var response ={};   
    try{
        const result = await mongo.Locations.findOne({ _id:  new ObjectId(id)});
        
        if (result) {
            response = {
                "data" :{
                    "item": result,
                    "message": "Location found.",
                    "code":201
                }   
            };
            return response;
        } else {
            response = {
                "error": {
                    "code": 401,
                    "message": "No Location found."
                  }
            }
            return response;
        }    
    }
    catch(err){
        response = {
            "error": {
                "code": 500,
                "message": "Error fetching location.",
                "errordata": err
              }
        }
        return response;
    }    
};

var updateLocation = async function (location) {
    var response ={};
    try{
        var result = await mongo.Locations.updateOne({ _id: new ObjectId(location.id) }, { $set: {
            name:location.name,            
            description:location.description,
            url:location.url,
            lasteditedby:location.lasteditedby,
            editedat:location.editedat
        } });    
        
        if(result.matchedCount<1){
            response = {
                "error": {
                    "code": 401,
                    "message": "No Location found."
                  }
            }
            return response;
        } else{
            if(result.modifiedCount==1){
                if(location.parentType=="subproject")
                {
                    var projresult=await mongo.SubProjects.updateOne(
                        {                        
                            "children.id":new ObjectId(location.id)
                        },
                    {$set:{"children.$.name":location.name}},
                    { upsert: false });
                }
                else{
                    var projresult=await mongo.Projects.updateOne(
                        {                        
                            "children.id":new ObjectId(location.id)
                        },
                    {$set:{"children.$.name":location.name}},
                    { upsert: false });
                }
                
                response = {
                    "data" :{                   
                        "message": "Location updated successfully.",
                        "code":201
                    }   
                };
                return response;
            }           
            else{
                response = {
                    "data" :{                    
                        "message": "Failed to update the location details.",
                        "code":409
                    }   
                };
                return response;
            }                   
        }   
    }
    catch(err){
            response = {
            "error": {
                "code": 500,
                "message": "Error processing location updates.",
                "errordata": err
              }
        }
        return response;
    }
    
};
//Soft Delete/undelete
var updateLocationVisibilityStatus = async function (id,name,parentId,parentType,isVisible) {
    var response ={};
    try {
        //update the Projects collection as well.        
        var result = await mongo.Locations.updateOne({_id:new ObjectId(id)},{$set:{isdeleted:!isVisible}});
        if(result.matchedCount==0){
            response = {
                "error": {
                    "code": 405,
                    "message": "No location found, invalid id."                    
                }
            }
            return response;
        }
        if(result.modifiedCount==1){
            if(!isVisible)
            {
                if(parentType=="subproject")
                    var projresult = await mongo.SubProjects.updateOne({_id:new ObjectId(parentId)},{ $pull: { children: {"id":new ObjectId(parentId)}}});     
                else
                    var projresult = await mongo.Projects.updateOne({_id:new ObjectId(parentId)},{ $pull: { children: {"id":new ObjectId(parentId)}}});     
            }
                
            else{
                if(parentType=="subproject")
                    var projresult = await mongo.SubProjects.updateOne({_id:new ObjectId(parentId)},{ $push: { children: {"id":new ObjectId(parentId),"name":name,"type":"location"}}});
                else
                    var projresult = await mongo.Projects.updateOne({_id:new ObjectId(parentId)},{ $push: { children: {"id":new ObjectId(parentId),"name":name,"type":"location"}}});
            }
                
            if (projresult.modifiedCount>0)
            {
                var message = `Location state updated successfully,is Visible:${isVisible}.parent project updated successfully.`;                
            }
            else
                var message = `Location state updated successfully,is Visible:${isVisible}.project failed to update.`;
                
            response = {
                "data" :{                
                    "message": message,
                    "code":201
                }   
            };
            return response; 
            
        }
        else{
            response = {
                "error": {
                    "code": 405,
                    "message": "No location modified, try with changed visibility state."                    
                }
            }
            return response;           
        }
    } catch (error) {
        response = {
            "error": {
                "code": 500,
                "message": "Error changing visibility of location.",
                "errordata": err
              }
        }
        return response;
    }    
};

var deleteLocationPermanently = async function (id) {
    try{
        var result = await mongo.Locations.deleteOne({_id: new ObjectId(id)});

        if(result.deletedCount==1){
           
            var response = {
                "data" :{                    
                    "message": "Location deleted successfully.",
                    "code":201
                }   
            };
            return response;
        }
        else{
            response = {
                "error": {
                    "code": 401,
                    "message": "No Location found."
                  }
            }
            return response;  
        }            
    }
    catch(err){
        response = {
            "error": {
                "code": 500,
                "message": "Error deleting location.",
                "errordata": err
              }
        }
        return response;
    }
    
};

var addRemoveSections = async function(locationId,isAdd,{id,name}){
    var response = {};
    try {
        if(isAdd)
            var result = await mongo.Locations.updateOne({_id:new ObjectId(locationId)},{ $push: { sections: {"id":id,"name":name}}});
        else
            var result = await mongo.Locations.updateOne({_id:new ObjectId(locationId)},{ $pull: { sections: {"id":id,"name":name}}});
        
        if (result.matchedCount==0){
            response = {
                "error": {
                    "code": 409,
                    "message": "No location found."
                }
            }
            return response;   
        }
        if(result.modifiedCount==1){
            response = {
                "data" :{                                   
                    "message": "Location added/removed to/from the location successfully.",
                    "code":201
                }   
            };
            return response;        
        }
        else{
            response = {
                "error": {
                    "code": 409,
                    "message": "Error adding/removing common location to/from the location."
                }
            }
            return response;       
        }
    } catch (error) {
        response = {
            "error": {
                "code": 500,
                "message": "Error adding common location to the location.",
                "errordata": err
              }
        }
        return response;
    }
}

module.exports = {
    addLocation,    
    updateLocationVisibilityStatus,
    deleteLocationPermanently,    
    updateLocation,  
    getLocationById,        
    addRemoveSections
};