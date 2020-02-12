const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const projectSchema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now
  },
  creator: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply a user!'
  },
  members: [ {type : mongoose.Schema.ObjectId, ref: 'User' } ],
  name: {
    type: String
  },
  description: {
    type: String,
    trim: true
  },
  allowMultipleParticipation: {
    type: Boolean,
    default: false
  },
  showCompletionCode: {
    type: Boolean,
    default: false
  },
  welcomeMessage: {
    type: String,
    default: ''
  },
  completionMessage: {
    type: String,
    default: ''
  },
  useNotifications: {
    type: Boolean,
    default: false
  },
  currentlyActive  : Boolean,
  tests            : [{ type : mongoose.Schema.ObjectId, ref: 'Test' }],
  invitations      : [{ email: String, token: String }],
  notifications    : [
    {
      id           : String,
      name         : String,
      mode         : String,
      date         : { type: Date, default: Date.now },
      interval     : { type: String, default: 'not_defined' },
      int_start    : { type: Date, default: Date.now },
      int_end      : { type: Date, default: Date.now },
      title        : { type: String, default: 'Open Lab' },
      message      : { type: String, default: 'Please complete a test.' },
      duration     : { type: Number, default: 0 }
    }
  ],
  osf              : {
    upload_link    : String,
    upload_token   : String,
    title          : String,
    policy         : { type: String, default: 'OL' },
    project_link   : String,
  }

});

projectSchema.statics.getCurrentProjects = function() {
  return this.aggregate([
    { $match : { 'currentlyActive': true }},
    { $project: {
      name: '$$ROOT.name',
      description: '$$ROOT.description',
    }},
    { $sort: { name: 1 } }
  ]);
};

projectSchema.statics.findAllPublic = function() {
  return this.aggregate([
    { $match: { currentlyActive: true } },
    { $lookup: {
        from: 'users', localField: 'creator', foreignField: '_id', as: 'author'}
    },
    { $project: {
      name: '$$ROOT.name',
      description: '$$ROOT.description',
      created: '$$ROOT.created',
      author_name: '$author.name',
      author_institute: '$author.institute',
    }},
    { $sort: { created: 1 } }
  ]);
};

projectSchema.statics.debugProjects = function() {
  return this.aggregate([
    // { $match: { currentlyActive: true } },
    { $lookup: {
        from: 'users', localField: '_id', foreignField: 'participantInProject', as: 'participant'}
    },
    { $project: {
      name: '$$ROOT.name',
      description: '$$ROOT.description',
      created: '$$ROOT.created',
      author_name: '$author.name',
      author_institute: '$author.institute',
      participants: '$participant',
      members: '$$ROOT.members',
      tests: '$$ROOT.tests',
      currentlyActive: '$$ROOT.currentlyActive',
      creator: '$$ROOT.creator',
    }},
    { $sort: { created: 1 } }
  ]);
};

projectSchema.index({
  creator: 1,
});

//pre-save validation to make sure that the project with the same name does not already exist
projectSchema.pre('save', function(next){
  if (!this.isModified('name') || this.name === ''){
    next();//skip it
  };
  var self = this;
  mongoose.models["Project"].findOne({name: self.name}, function(err, project){
    if(err){
      next(err);
    } else if(project){
      self.invalidate("name", "This name already exists");
      next(new Error('This name is already taken'));
    } else {
      next();
    }
  });
});

//find projects which user has created
projectSchema.virtual('participants', {
  ref: 'User',//what model to link
  localField: '_id',//which field in the current model
  foreignField: 'participantInProject',//should match field in the other model
  justOne: false
});

function autopopulate(next){
  this.populate({path: 'participants', select: 'participantInProject'});
  next();
};

projectSchema.pre('findOne', autopopulate);
projectSchema.pre('find', autopopulate);

module.exports = mongoose.model('Project', projectSchema);
