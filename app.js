//importing modules
var express = require( 'express' );
var request = require( 'request' );
var cheerio = require( 'cheerio' );

//creating a new express server
var app = express();

//setting EJS as the templating engine
app.set( 'view engine', 'ejs' );

//setting the 'assets' directory as our static assets dir (css, js, img, etc...)

app.use( '/assets', express.static( 'assets' ) );


//makes the server respond to the '/' route and serving the 'home.ejs' template in the 'views' directory
//c'est une requtte get pour récupérer les info du lien qui se trouvent après /
app.get( '/', function ( req, res ) {
	//res.render() will look in a views folder for the view
    res.render( 'pages/index') , {
        /* message: 'The Home Angelica Page!' */
    }
});

//le bouton s'appelle process, lorsque je click j'appelle cette fonction anonyme
//req=requette
//res=répons
app.get('/process', function(req, res){
	const url= req.query.lbcUrl; // on récupère l'adresse url

	if( url ) {

		getLBCData(url,req,getMAEstimation) 
//function en param d'une autre fonction qui se déclache lorsque j'appuye 
// 			sur le bouton
//c'est une fonction de call back qui s'execute une foi qu'on a fini

	}
	else { //si l'url n'est pas valide 
		res.render('pages/index',{error: 'Url is empty'});
		// affiche sur la page index
		 } //répértoire : pages et puis un fichier js qu'on appelle index
});


//fonction anonyme !! elle prend moins de place 
function getLBCData( lbcUrl, routeReponse, callback){
	request(lbcUrl, function(error, response,html){
		if(!error){ //si j'ai pas d'érreur
			let $=cheerio.load(html) // cheerio sert à générer la page html
			// let = soit= déclaration de variable
			const lbcData=parseLBCData(html) // contient toutes les valeurs nécessaires du site 

			if(lbcData){
				console.log('LBC Data', lbcData) // on les affiche toutes les données
				callback(lbcData, routeReponse) 
			}
			else{ 
				routeReponse.render('pages/index',{
					error: 'No data found'
				});
				}
		}
		else{
			routeReponse.render('pages/index',{
				error: 'Error loading the given URL'});
			}
});
}
function getMAEstimation( lbcData, routeResponse){ 
  
  if( lbcData.city && lbcData.postalCode && lbcData.surface && lbcData.price){

    const url = 'https://www.meilleursagents.com/prix-immobilier/{city}-{postalCode}/' // à partir de ça on aura le prix moyen du m^2
    .replace('{city}', lbcData.city.replace(/\_/g, '-') )
    .replace( '{postalCode}', lbcData.postalCode);
    
    console.log( 'MA URL :', url);

    
    request(url, function ( error, response, html){
      if (error){
        let $ = cheerio.load(html); // soi $ la page courante 

        console.log($('meta[name=description]').get());
        console.log($('meta[name=description]').get()[0].attribs);
        console.log($('meta[name=description]').get()[0].attribs.content);
        
        if($('meta[name=description]' ).get().length === 1 
        	&& $('meta[name=description]' ).get()[0].attribs 
            && $('meta[name=description]').get()[0].attribs.content) {
          
          const maData = parseMAData( $('meta[name=description]').get()[0].attribs.content);
          
          console.log( 'MA Data:', maData)
          
          if( maData.priceAppart && maData.priceHouse){
            routeResponse.render( 'pages/index', {
              data: {
                lbcData,
                maData,
                deal: {
                  good: isGoodDeal(lbcData, maData)
	                }
	              }
	          });
	        }
	        else {
	        	routeReponse.render('pages/index', {
	        		error: 'Error loading estimation data from MeuilleursAgents'
	        	});
	        }
 	 	}
	}
	else {
        /*routeResponse.render( 'pages/index', {
            error: 'Fetched data is incorrect: ' + JSON.stringify( lbcData )
        });*/
    }
});
}
}
function parseLBCData( html ){
	const $ = cheerio.load( html )

	const lbcDataArray = $( 'section.properties span.value' )

  //console.log(lbcDataArray.get(0) );

	return lbcData = {
		price: parseInt( $( lbcDataArray.get(0) ).text().replace( /\s/g, ''), 10),
		city : $( lbcDataArray.get(1)).text().trim().toLowerCase().replace(/\_|\s/g, '-').replace(/\-\d+/, ''),
		postalCode: $(lbcDataArray.get(1)).text().trim().toLowerCase().replace( /\D|\-/g, ''),
		type: $( lbcDataArray.get(2) ).text().toLowerCase(),
		surface: parseInt( $(lbcDataArray.get(4)).text().replace(/\s/g, ''), 10),
	}
}
function parseMAData( html ) {

    const priceAppartRegex = /\bappartement\b : (\d+) €/mi // /\b pour enlever les balises qui met en gras
    const priceHouseRegex = /\bmaison\b : (\d+) €/mi

    if ( html ) {
    	// 							if  																 else réduit 
        const priceAppart = priceAppartRegex.exec( html ) && priceAppartRegex.exec( html ).length === 2 ? priceAppartRegex.exec( html )[1] : 0
        const priceHouse = priceHouseRegex.exec( html ) && priceAppartRegex.exec( html ).length === 2 ? priceHouseRegex.exec( html )[1] : 0

        return {
            priceAppart: parseInt( priceAppart, 10 ),
            priceHouse: parseInt( priceHouse, 10 )
        }
    }

    return {}

}


function isGoodDeal(lbcData, maData){
	if(lbcData.type =='appartement') { var prix_moyen = maData.priceAppart;} /* c'est le pris du meilleurs agents */
	else {	var prix_moyen = maData.priceHouse; }
	//si c'est appart on prend le prix moyen des appartements donné par le site des meilleurs agents
	// sinon on prend celui des maisons
	//on multiplie ce prix par la surface du bien qui nous interesse pour avoir une estiomation des meilleurs agents
	var estimation = lbcData.surface * prix_m;
	// mtn on compare si notre estimation est supérieure ou inférieure au prix du bon coin 
	// si oui c'est un good deal sinon, le bien est proposé plus cher que la moyenne des prix dans cette ville
	if(estimation <lbcData.price ){ var resultat ="Is a good deal"; return resultat;}
	else{var resultat ="Is NOT a good deal"; return resultat;} 
}
/*
window.onload = function(){
    var canvas = document.getElementById('mon_canvas');
        if(!canvas){
			alert("Impossible de récupérer le canvas");
				return;}
    var context = canvas.getContext('2d');
		if(!context){
            alert("Impossible de récupérer le context du canvas")
            return;		}
    //C'est ici que l'on placera tout le code servant à nos dessins.
}

*/
//launch the server on the 3000 port
app.listen( 3000, function () {
    console.log( 'App listening on port 3000!' );
});