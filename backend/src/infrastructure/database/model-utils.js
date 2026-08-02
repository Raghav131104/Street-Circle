const { Schema } = require("mongoose");

const objectId = (ref, required = true) => ({ type: Schema.Types.ObjectId, ref, required, index: false });
const pointSchema = new Schema({
  type: { type: String, enum: ["Point"], required: true, default: "Point" },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator(value) {
        return value.length === 2
          && value[0] >= -180 && value[0] <= 180
          && value[1] >= -90 && value[1] <= 90;
      },
      message: "Coordinates must be [longitude, latitude] within valid ranges",
    },
  },
}, { _id: false });

module.exports = { objectId, pointSchema };
