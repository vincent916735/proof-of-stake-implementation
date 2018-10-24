const interval = 10;
const total_nodes = 20;

class Timeslot {

    static constructor(){
        this.total_nodes = total_nodes;
    }

    static initialUnixTime(){
        return new Date(1539475100000).getTime(); //1018:10:14:0:0:0
    }

    static converToEpochTime(dateTime){
        if (typeof dateTime === 'undefined'){
            dateTime = (new Date()).getTime(); //current time
        }
        let result = Math.floor((dateTime - this.initialUnixTime()) / 1000);
        return result;
    }

    static convertToSlotNumber(epochTime){
        if (typeof epochTime === 'undefined'){
            epochTime = this.converToEpochTime();
        }
        let result = Math.floor(epochTime / interval);
        return result;
    }

    static nextSlot(){
        return this.convertToSlotNumber() + 1;
    }

}

module.exports = Timeslot;