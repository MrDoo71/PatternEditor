//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 

var gInteractionPrefix; 

function kinodbGlue( dataAndConfig, ptarget, options )
{
    //Remove the svg if called by graph_kill
    if ( dataAndConfig === null )
    {
        var parent = document.getElementById(ptarget).parentNode;
        var child = document.getElementById(ptarget);
        parent.removeChild(child);
        return ;
    } 
      
    //This is a graph initialisation
    gInteractionPrefix = options.interactionPrefix;    
    
    function newkvpSet(noRefresh)
    {
        var kvp = { } ;
        kvp.kvps = new Array() ;

        kvp.add = function (k, v)
        {
            this.kvps.push ( {k: k, v: v} ) ;
        } ;

        kvp.toString = function (p)
        {
            var r = '' ;

            for (var i = 0 ; i < this.kvps.length ; i++)
            {
                r += '&' + p + this.kvps[i].k + '=' + this.kvps[i].v ;
            }

            return r ;
        } ;

        if (noRefresh)
            kvp.add("_noRefresh", -1) ;

        return kvp ;
    }
    
    // show menu on right-click.
    var contextMenu = function(d) {
   		d3.event.preventDefault() ;
    	var v = newkvpSet(false) ;
    	v.add("x", d.x) ;   
    	v.add("y", d.y) ;    
    	goGraph( gInteractionPrefix + ':' + d.data.contextMenu ,
    			 d3.event, 
    			 v ) ;
    }      
    
    //Convert the JSON data into Javascript drawing objects
    var patternData = dataAndConfig.pattern;
    var patternPiece1 = new PatternPiece( patternData.patternPiece[0] );
    var targetdiv = d3.select( "#" + ptarget );
    
    doDrawing( targetdiv, patternPiece1, contextMenu );
    
    doTable( targetdiv, patternPiece1, contextMenu );
}


//Do the drawing... (we've added draw() to each drawing object.
function doDrawing( graphdiv, patternPiece1, contextMenu )
{
    var margin = 25; 
    var width = 400;
    var height = 600;

    var svg = graphdiv.append("svg")
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

    var transformGroup = svg.append("g")
                            .attr("transform", "translate(" + ( margin ) + "," + ( margin ) + ")");

    var scaleX = width / ( patternPiece1.bounds.maxX - patternPiece1.bounds.minX );                   
    var scaleY = height / ( patternPiece1.bounds.maxY - patternPiece1.bounds.minY );           
    
    if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
        scale = scaleX > scaleY ? scaleY : scaleX;
    else if ( isFinite( scaleX ) )
        scale = scaleX;
    else
        scale = 1;

    var transformGroup = transformGroup.append("g")
                               .attr("transform", "scale(" + scale + "," + scale + ")");

    var transformGroup = transformGroup.append("g")
                               .attr("transform", "translate(" + ( ( -1.0 * patternPiece1.bounds.minX ) ) + "," + ( ( -1.0 * patternPiece1.bounds.minY ) ) + ")");

    var onclick = function(d) {
        d3.event.preventDefault() ;
        console.log( "Click! " );
        $( ".j-active" ).removeClass("j-active");
        $(this).addClass("j-active");
        //d.tableSvg.attr("class","j-active");
        $( d.tableSvg[0] ).addClass("j-active");
    }

    var a = transformGroup.selectAll("g");    
    a = a.data( patternPiece1.drawingObjects );
    a.enter()
     .append("g")
     .each( function(d,i) {
        var g = d3.select( this );
        //d.calculate();

        d.drawingSvg = g;

        g.on("contextmenu", contextMenu);
        g.on("click", onclick);

        if ( typeof d.draw === "function" )
            d.draw( g );
    });
}


function doTable( graphdiv, patternPiece1, contextMenu )
{
    var margin = 25; 
    var width = 400;
    var height = 600;
    var itemHeight = 30;
    var itemMargin = 8;
    var itemWidth = 300;
    var ypos = -itemHeight;
    var seq = 1; //TODO get these in the XML as data?

    var svg = graphdiv.append("svg")
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));    

    a = svg.selectAll("g");
    a = a.data( patternPiece1.drawingObjects );
    a.enter()        
     .append("g")
     .each( function(d,i) {
        var g = d3.select( this );
        //d.calculate();

        g.append("rect")
         .attr( "x", 0 )
         .attr( "y", function (d) { ypos += itemHeight + itemMargin; return ypos } )
         .attr( "width", itemWidth )
         .attr( "height", itemHeight )
         //.attr("fill", "#e0e0e0");

//            g.append( "text" )
//             .text( function (d) { return d.data.name; } )
//             .attr("x", 5 )
//             .attr("y", function (d) { return ypos + (0.5 * itemHeight) } )
//             .attr("font-family", "sans-serif")
//             .attr("font-size", "14px")
//             .attr("font-weight", "bold")
//             .attr("fill", "black");

        g.attr( "class", "j-item");
        d.tableSvg = g;

        g.append( "foreignObject" )
         .attr( "x", 5 )
         .attr( "y", function (d) { 
             return ypos;// + 5;// + (0.5 * itemHeight); 
         } )
         .attr( "width", "290" )
         .attr( "height", "100" )
         //.attr( "requiredFeatures", "http://www.w3.org/TR/SVG11/feature#Extensibility" )
         //.append( "body" )
         .append( "xhtml:div" )
         .attr( "style", "color:black")
         //.attr( "xmlns", "http://www.w3.org/1999/xhtml" )
         .html( d.html() );// "hello world <a href=\"www.google.co.uk\">google</a>" );

        g.on("contextmenu", contextMenu);
    });                                   

}