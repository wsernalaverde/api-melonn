import mongoose from 'mongoose'
const Schema = mongoose.Schema

const SellOrderSchema = new Schema({
  store: {
    type: String,
    required: true
  },
  externalOrderNumber: {
    type: Number,
    required: true
  },
  buyerName: {
    type: String,
    required: true
  },
  buyerPhone: {
    type: Number,
    required: true
  },
  buyerEmail: {
    type: String,
    required: true,
    unique: true
  },
  shippingAddress: {
    type: String,
    required: true
  },
  shippingCity: {
    type: String,
    required: true
  },
  shippingRegion: {
    type: String,
    required: true
  },
  shippingCountry: {
    type: String,
    required: true
  },
  lineItems: {
    type: Array,
    required: true,
    default: {}
  },
  shippingMethod: {
    type: Object,
    required: true
  },
  creationDate: {
    type: String,
    required: true
  },
  internalOrderNumber: {
    type: String,
    required: true
  }
})

const SellOrder = mongoose.model('SellOrder', SellOrderSchema)

module.exports = SellOrder
