const ApiError = require('../error/ApiError')
const {Op} = require("sequelize");
const { Wallet, Reservation, Name } = require("../models/models")
const moment = require('moment');

class LandingStatController {
    async getInitialStat(req, res, next) {
        try{
            const total = {
                reservaions_count: 0,
                value_usd: 0,
            }

            total.reservaions_count = await Reservation.count()
            const value_true = await Reservation.sum("value_true")
            total.value_usd = value_true * 0.75
            
            const latest = await Reservation.findAll({
                limit: 5,
                order: [['date_time', 'DESC']]
            })

            const most_expensive = await Reservation.findAll({
                limit: 5,
                order: [['value_true', 'DESC']]
            })
            
            return res.json({total, latest, most_expensive})
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }
}

module.exports = new LandingStatController()