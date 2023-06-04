console.log( "kinodbglue1.js?v=2 loaded");

var moduleExports = {}; //we'll then set this reference in the module kinodbglue.mjs
var params = null; //in case we get called before the module loads, or we could sleep?
var iskDarkMode = false;

function drawPattern( dataAndConfig, ptarget, options ) 
{
    console.log( "Calling moduleExports.drawPattern");

    //This breaks forms, e.g. piece graph on a form, why did we need to do it? 
    //$( "div.k-bottom-main-buttons-wrapper" ).remove();

    if ( $("body.k-dark-mode").length )
    {
        iskDarkMode = true;
    }

    if ( moduleExports.drawPattern )
        moduleExports.drawPattern( dataAndConfig, ptarget, options );
    else
        params = { dataAndConfig:dataAndConfig, ptarget:ptarget, options:options };
}

function moduleLoaded()
{
    console.log( "module loaded, params:", params );

    if ( params )
        moduleExports.drawPattern( params.dataAndConfig, params.ptarget, params.options );
}

console.log( "kinodbglue1.js done");