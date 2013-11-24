<?php
/**
 * Load Template Plugin:
 * 
 * Loads the content of a page from a given namespace into the current
 * edited page doing some replacements on-the-fly.
 *
 * @author     Cilyan Olowen <gaknar@gmail.com>
 */
 
if(!defined('DOKU_INC')) die();
 
class action_plugin_loadtemplate extends DokuWiki_Action_Plugin {
 
    /**
     * Register the eventhandlers
     */
    public function register(Doku_Event_Handler $controller) {
        $controller->register_hook('TOOLBAR_DEFINE', 'AFTER', $this, 'insert_button', array ());
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this,'ajax_get_raw_page');
        $controller->register_hook('DOKUWIKI_STARTED', 'AFTER',  $this, 'populate_jsinfo');
        
    }
    
    /**
     * Add information to JSINFO, required for the loadtemplate client side
     */
    function populate_jsinfo(&$event, $param) {
        global $JSINFO;
        $JSINFO['tpll_ns'] = $this->GetConf('tpll_ns');
    }
    
    /**
     * Inserts the toolbar button
     */
    public function insert_button(& $event, $param) {
        $event->data[] = array (
            'type' => 'Tplwiz',
            'title' => $this->getLang('tpll_title'),
            'icon' => '../../plugins/loadtemplate/loadtemplate.png',
            'open' => '@@',
            'close' => '@@',
        );
    }
    
    /**
     * Handle ajax requests
     */
    function ajax_get_raw_page(&$event, $param) {
        if ($event->data !== 'loadtemplate') {
            return;
        }
        // No other ajax call handlers needed
        $event->stopPropagation();
        $event->preventDefault();
     
        // Get POST parameters
        global $INPUT;
        $pagename = $INPUT->post->str('q');
        $selection = $INPUT->post->str('selection');
        
        // Get raw template file and parse it according to DokuWiki template
        // replacements
        $data = array(
            'id'        => $pagename,
            'tpl'       => '',
            'tplfile'   => wikiFN($pagename),
            'doreplace' => true
        );
        $data['tpl'] = io_readFile($data['tplfile']);
        parsePageTemplate($data);
        // Additionally replace @SELECTION@
        $tpl = str_replace(
            array(
                 '@SELECTION@'
            ),
            array(
                $selection
            ), $data['tpl']
        );
        // Set content type to plain text
        header('Content-Type: text/plain');
        // Send data
        echo $tpl;
    }
}
//Setup VIM: ex: et ts=4 :
