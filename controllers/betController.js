const ApiError = require('../error/ApiError')
const {Op} = require("sequelize");
const { Wallet, Reservation, Name } = require("../models/models")
const moment = require('moment');
const { AnkrProvider } = require('@ankr.com/ankr.js');
const { default: axios } = require('axios');

async function getSHA256Hash(str) {
    const buf = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
}

function hashCode(s) {
    for (var h = 0, i = 0; i < s.length; h &= h)
      h = 31 * h + s.charCodeAt(i++);
    return h;
}

function namePrice(s) {
    lengthDiff = 13 - s.length;
    return(Math.max(20, Math.pow(10, 0.5 * lengthDiff)));
}

async function getWalletTransactions(walletAddress) {
    try {
        const response = await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`);
        const transactions = response.data.result;
        let startDate = moment(transactions[0].timeStamp, 'X').format('YYYY-MM-DD')
        let endDate = moment(); 
        const result = endDate.diff(startDate, 'days');
        return result;
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        return 0;
    }
}

class BetController {
    async create(req, res, next) {
        try{
            const { wallet, name, value_true, value_eth, referral } = req.body
            if(!wallet || !name || !value_true || !value_eth){
                return next(ApiError.internal('Please, forward required fields'))
            }
            
            const ip = req.socket.remoteAddress
            const user_agent = req.get('user-agent')

            let name_price = namePrice(name)

            // Провреяем, что переденная сумма валидна относительно базовой стоимости
            if(name_price > value_true){
                return next(ApiError.internal(`That name is worth more than the forwarded amount, the cost - ${name_price} $TRUE`))
            }

            // Провреяем, что переденная сумма валидна относительно существущих ставок
            const name_reservations = await Reservation.findAll({
                where: {name},
                order: [
                    ['value_true', 'DESC'],
                ]
            })
            

            if(name_reservations && name_reservations.length){
                if((name_reservations[0].value_true * 1.05) > value_true){
                    return next(ApiError.internal(`That name is worth more than the forwarded amount, the cost - ${name_reservations[0].value_true * 1.05} $TRUE`))
                }
            }

            // Ищем кошелек или создаем новый
            const existing_wallet = await Wallet.findOne({where: {address: wallet}})
            if (!existing_wallet){
                let new_referral = hashCode(wallet)
                // Базовая защита от коллизий
                const refferal_wallet = await Wallet.findOne({where: {referral: new_referral}})
                if(refferal_wallet){
                    new_referral = hashCode(wallet+"tns123"+(Math.random() * (99999 - 100) + 100).toString())
                }
                await Wallet.create({
                    address: wallet, 
                    referral: new_referral
                })
            }

            const wallet_resevations = await Reservation.findAll({
                where: {
                    wallet,
                    date_time: {
                        [Op.gte]: moment().subtract(10, 'minutes').format("YYYY-MM-DD HH:mm:ss")
                    }
                }
            })
            

            // Проверка что не больше 10, иначе капча
            if(wallet_resevations.length >= 10){
                return next(ApiError.toomanyrequests('Too many requests with that wallet'))
            }

            let wallet_total_balace = 0
            
            // Проверка баланса мультичейн портфолио кошелька, если сумма больше 20TRUE
            if(value_true > 20){
                const provider = new AnkrProvider('https://rpc.ankr.com/multichain/808aba36d8e2aa7203f41ce6968e0a616966799074bcd3f243db8854fc8a7bc3');
                const total_balance = await provider.getAccountBalance({
                    blockchain: ['arbitrum', 'avalanche', 'avalanche_fuji', 'base', 'bsc', 'eth', 'eth_goerli', 'fantom', 'flare', 'gnosis', 'linea', 'optimism', 'polygon', 'polygon_zkevm', 'rollux', 'scroll', 'syscoin'],
                    walletAddress: wallet,
                })

                if(total_balance.totalBalanceUsd && total_balance.totalBalanceUsd < value_true){
                    return next(ApiError.internal("You don't have enough funds on your wallet balance to reserve a name. Yes, it is completely free, but your wallet balance must at least match the selected bid."))
                }
                
                wallet_total_balace = total_balance.totalBalanceUsd
            }

            await Name.findOrCreate({where: {name}})

            const avatar_id = Math.floor(Math.random() * (116)) + 1;
            const wallet_lifetime = await getWalletTransactions(wallet)

            const reservation = await Reservation.create({
                name: name,
                date_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                wallet: wallet,
                wallet_multichain_balance_usd: Number(wallet_total_balace),
                wallet_lifetime_days: wallet_lifetime,
                referral: referral,
                value_true: value_true,
                value_eth: value_eth,
                icon_id: avatar_id,
                ip: ip,
                user_agent: user_agent
            })
            
            return res.json({reservation})
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }
}

module.exports = new BetController()