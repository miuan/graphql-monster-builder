import { Schema, Model, Types, model } from 'mongoose'
import { __MODEL_NAME__Model } from '../model-types'
export { Types } from 'mongoose'
__CONSTRUCTED_IMPORTS__

export const __SCHEMA_NAME__: Schema = new Schema({
    __CONSTRUCTED_MEMBERS__
},
{
  timestamps: true,
  usePushEach: true,
  versionKey: false,
});

__CONSTRUCTED_INDEXIES__
// __SCHEMA_NAME__.pre('find', function() {
//   (<any>this)._startTime = Date.now();
// });

// __SCHEMA_NAME__.post('find', function() {
//   if ((<any>this)._startTime != null) {
//     // console.log('Runtime in MS: ', Date.now() - (<any>this)._startTime);
//   }
// })

// __SCHEMA_NAME__.pre('findOne', function() {
//   (<any>this)._startTime = Date.now();
// });

// __SCHEMA_NAME__.post('findOne', function() {
//   if ((<any>this)._startTime != null) {
//     // console.log('Runtime in MS: ', Date.now() - (<any>this)._startTime);
//   }
// })

// __SCHEMA_NAME__.pre('update', function() {
//   (<any>this)._startTime = Date.now();
// });

// __SCHEMA_NAME__.post('update', function() {
//   if ((<any>this)._startTime != null) {
//     // console.log('Runtime in MS: ', Date.now() - (<any>this)._startTime);
//   }
// })

// __SCHEMA_NAME__.post('save', (error, doc, next) => {
//   if (error.name === 'ValidationError') {
//     next(new Error('email must be unique'));
//   } else {
//     next(error);
//   }
//   })

__EXPORT_MODEL__