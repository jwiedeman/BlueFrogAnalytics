




/* COUTNDOWN TIMER COMPONENT*/


Vue.component('Timer',{
	template: `
  	<div>
<div class="status-tag " :class="statusType">{{ message }}</div>
      <div v-show ="statusType !== 'expired'" class='container text-muted '>
        <div class="day ">
          <span class="number">{{ days }}</span>
          <div class="format">{{ wordString.day }}</div>
        </div>
        <div class="hour ">
          <span class="number">{{ hours }}</span>
          <div class="format">{{ wordString.hours }}</div>
        </div>
        <div class="min ">
          <span class="number">{{ minutes }}</span>
          <div class="format">{{ wordString.minutes }}</div>
        </div>
        <div class="sec ">
          <span class="number">{{ seconds }}</span>
          <div class="format">{{ wordString.seconds }}</div>
        </div>
      </div>




      
    </div>
  `,
  props: ['starttime','endtime','trans'] ,
  data: function(){
  	return{
    	timer:"",
      wordString: {},
      start: "",
      end: "",
      interval: "",
      days:"",
      minutes:"",
      hours:"",
      seconds:"",
      message:"",
      statusType:"",
      statusText: "",
    
    };
  },
  created: function () {
        this.wordString = JSON.parse(this.trans);
    },
  mounted(){
    this.start = new Date();
    this.end = new Date(this.endtime).getTime();
    // Update the count down every 1 second
    this.timerCount(this.start,this.end);
    this.interval = setInterval(() => {
        this.timerCount(this.start,this.end);
    }, 1000);
  },
  methods: {
    timerCount: function(start,end){
        // Get todays date and time
        var now = new Date().getTime();

        // Find the distance between now an the count down date
        var distance = start - now;
        var passTime =  end - now;

        if(distance < 0 && passTime < 0){
            this.message = this.wordString.expired;
            this.statusType = "expired";
            this.statusText = this.wordString.status.expired;
            clearInterval(this.interval);
            return;

        }else if(distance < 0 && passTime > 0){
            this.calcTime(passTime);
            this.message = this.wordString.running;
            this.statusType = "running";
            this.statusText = this.wordString.status.running;

        } else if( distance > 0 && passTime > 0 ){
            this.calcTime(distance); 
            this.message = this.wordString.upcoming;
            this.statusType = "upcoming";
            this.statusText = this.wordString.status.upcoming;
        }
    },
    calcTime: function(dist){
      // Time calculations for days, hours, minutes and seconds
        this.days = Math.floor(dist / (1000 * 60 * 60 * 24));
        this.hours = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        this.minutes = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        this.seconds = Math.floor((dist % (1000 * 60)) / 1000);
    }
    
  }
});






new Vue({
  el: '#app',
  data () {
    return {
      image:{
        rocket:{
          falcon9:'./assets/falcon9.jpg',
          soyuz:'https://media.giphy.com/media/4WFEuV8V1BBxa8jU7M/giphy.gif',
          electron:'https://spacenews.com/wp-content/uploads/2017/05/electron-onpad.jpg',
          launcherone:'https://cdn.vox-cdn.com/thumbor/m_bWaVxIiYdAEBtjQpNXS8vAdaU=/0x0:2048x1152/1200x800/filters:focal(861x413:1187x739)/cdn.vox-cdn.com/uploads/chorus_image/image/60386043/747_L1_InFLight.4k02.0.png',
          ariane5:'./assets/ariane5.gif',
          pslv:'http://im.rediff.com/news/2016/sep/09isro.jpg',
          hyperbola1:'./assets/hyperbola1.jpg',
          GSLVMK3:'http://i.imgur.com/MpO4uEr.jpg',
          longmarch2c:'./assets/longmarch2c.jpg',
          kuaizhou1A:'./assets/Kuaizhou1A.jpg',
          sslv:'./assets/SSLV.jpg',
          protonm:'./assets/proton-m.jpg',
          atlasv:'./assets/atlas-v.jpg',
          rokot:'./assets/rokot.jpg',
          deltaiv:'./assets/deltaiv.jpg',
          pegasusxl:'./assets/pegasusxl.jpg',
          HIIB:'./assets/H-IIB.jpg',
        }
      },
      info: null
    }
  },
  

  mounted () {
    axios
      .get('https://launchlibrary.net/1.4/launch/next/1000')
      .then(response => (this.info = response.data.launches))
   
  }
})