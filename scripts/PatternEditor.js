//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 
/*
require.config({
    baseUrl: '../lib',
    paths: {
        scripts: './scripts',
        "kld-affine": '../node_modules/kld-affine/dist/index-umd',
        "kld-intersections" : '../node_modules/kld-intersections/dist/index-umd'
    }
});
*/

define(function (require) {
    // Load any app-specific modules
    // with a relative require call,
    // like:
    //var messages = require('./messages');
    require('kld-intersections');
    require('scripts/PatternPiece');
    require('scripts/drawing/Drawing');
    require('scripts/drawing/DrawingObject');

    // Load library/vendor modules using
    // full IDs, like:
    //var print = require('print');
    //print(messages.getHello());
});

//requirejs(["scripts/PatternPiece"]);
//requirejs(["scripts/drawing/Drawing"]);

var gInteractionPrefix; 
var selectedObject;
var linksGroup;

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
        $( ".j-item.source" ).removeClass("source");
        $( ".j-item.target" ).removeClass("target");
        $(this).addClass("j-active");
        d.tableSvg.each( function(d,i) {
            $(this).addClass("j-active");
        });
        selectedObject = d;
        //drawLinks( patternPiece1 );

        linksGroup.selectAll("path.link") //rename .link to .dependency
            .attr("class", function( d ) {                         
                if ( d.source == selectedObject ) 
                {
                    d.target.tableSvg.each( function() { $(this).addClass("source"); } );
                    return "source link";
                }
                if ( d.target == selectedObject ) 
                {
                    d.source.tableSvg.each( function() { $(this).addClass("target"); } );
                    return "target link";
                }
                return "link"; 
            } );
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

    //Enable Pan and Zoom
    //https://observablehq.com/@d3/zoom
    //TODO if a point is selected then zoom with it as the focus
    //SEE https://bl.ocks.org/mbostock/a980aba1197350ff2d5a5d0f5244d8d1
    /*
    function zoomed() {
        transformGroup.attr("transform", d3.event.transform);
    }; this doesn't quite work well enough
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([1, 8])
        .on("zoom", zoomed));
    */
}


function doTable( graphdiv, patternPiece1, contextMenu )
{
    var margin = 25; 
    var width = 400;
    var height = 600;
    var itemHeight = 30;
    var itemMargin = 8;
    var itemWidth = 300;
    var ypos = 0;
    var seq = 1; //TODO get these in the XML as data?

    var svg = graphdiv.append("svg")
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));    

    a = svg.selectAll("g");
    a = a.data( patternPiece1.drawingObjects );
    a.enter()        
     .append("g")
     .each( function(d,i) {

        var divHeight = function( that) {
            var t = this;//that ? that : this;
            var h = 0;
            if ( t.getBoundingClientRect )
                h = t.getBoundingClientRect().height;

            if ( t.childNodes )    
            {
                for( var i=0; i<t.childNodes.length; i++ )
                {
                    if ( ! t.childNodes[ i ].getBoundingClientRect )
                        continue;
                    var thisH = t.childNodes[ i ].getBoundingClientRect().height ;
                    if ( thisH > h )
                        h = thisH;
                }                
            }
            else
                h = 0;
            //console.log( "divheight ", h );
            if ( h < itemHeight )
                return itemHeight;
            return h;
        };

        var g = d3.select( this );

        g.attr( "class", "j-item") ;

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * itemHeight );

        var fo = g.append( "foreignObject" )
         .attr( "x", 0 )
         .attr( "y", function (d) { 
             return ypos;
         } )
         .attr( "width", itemWidth  );

         var div = fo.append( "xhtml:div" )
         .html( d.html() );



        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
         .attr( "y", function (d) { 
                                    var h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu);
    });                   
    
    linksGroup = svg.append("g")
                    .attr("class", "links");

    this.drawLinks( patternPiece1 );
}


function drawLinks( patternPiece )
{
    var linkData = patternPiece.dependencies.dependencies;

    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", curve);
}


/*
 * Curve that connects items in the table.
 */
function curve(link) {
    var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
        x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;

    var dx = x0 - x1,
        dy = y0 - y1,
        l = Math.log( Math.abs(dy /30 ) ) * 50;

    var path = d3.path();
    path.moveTo( x0, y0 );
    path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
    return path;                      
}