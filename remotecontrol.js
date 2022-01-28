//  remotecontrol
//  -------------
//  enables two-way communication between the game (eg: unscrewu) and the host (eg: ct3)
//  2022.01.14  Dov@GamesThatWork


const error = msg=>{ throw(`[RemoteControl] Error ${msg}`) };

const logEntry = event=>    `<div><span>from:</span>${event.source.document.title}
                            ${Object.keys( event.data ).map( k=> `<span>${k}:</span>${event.data[k]}`).join("")}
                            </div>`;
export default {
    
    launchGame: config =>{
        
        if( typeof config=="string")    config = {url:config};

        let {   url,           // this must be in the same origin                       
                messageHandler  = console.log, 
                autostart       = false,
                windowName      = "Unscrew U", 
                windowFeatures  = "resizable,popup", 
                log                                     } = config;

        let host = new URL( window.location.href );
        url      = new URL( url, host );


        if( !url )  
            error( "launchGame: Please supply a valid URL");
        if( url.origin!=host.origin )  
            error( `launchGame: Game URL origin (if present) must match your origin:
            '${url.origin}' does not match '${host.origin}'
            try '${host.origin}${url.pathname.slice(1)}' or just '${url.pathname.slice(1)}'  `);
        if( typeof messageHandler !== "function" )    
            error( "launchGame: Please supply a callback function as 'messageHandler'");
            

        const game =   window.open( url.href, windowName, windowFeatures);
        
        if( !game.document.body ) {
            game.close();   
            error( `launchGame: Could not open the url:  ${url.href}` );
            }
        function toGame( request, data ) {
            const payload = Object.assign( {request}, data );
            let error= game.postMessage( payload,"*" );
            }

        if( messageHandler )    window.addEventListener( "message", messageHandler );
        if( log )               window.addEventListener( "message", event=> log.innerHTML+=logEntry(event) );


        const api = {
            start: ()=>  toGame("start"  ),
            end:   ()=>  toGame("end"    ),
            report:()=>  toGame("report" ),
            play:  (episode=1,passage=0)=> toGame( "play", {episode,passage} ) 
            }

        if( autostart )   game.addEventListener('load', api.start);
        return api;    
        },
     
/// This function is used by the game to communicate back to the host

    getHost: config =>{

        const { play, end=window.close, log } = config;

        // NOTE:   play =  data => play( data.episode, data.passage ),

        const ping={
            last:                      Date.now(),
            now:  ()=>     ping.last = Date.now(),
            inactive: ()=> Math.floor((Date.now() - ping.last) /1000 )  
            }
            
            
        const state={
            status: "waiting",
            episode: 1,
            passage: 0,
            score: 0
            }

        const host = window.opener;

        const report= newState => 
            host.postMessage( Object.assign( 
                        state, newState??{}, {inactivity: ping.inactive()}));
     
        const start = ()=> play( { episode:1, passage:0 });

        const obey ={   play, end, start, report }

     
        setInterval(  e=>{
            if( ping.inactive() > 300 ){
                state.status = "inactive";
                report();
                }
            }, 5*60*1000 );
        
 
        window.addEventListener( "message", event=> {
            if( event.source === host  ) 
                    ( obey[ event.data?.request ] ?? error )( event.data );
            //else error( `invalid message source ${event.source}` );
            });
 
        if( log ) window.addEventListener( "message", event=> log.innerHTML+=logEntry(event) );
          
        return {
            report,
            update: newState =>{
                ping.now()
                Object.assign( state, newState);
                report()
                },
        }

    }
}