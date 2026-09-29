<?php
// Standalone adapter test: php test/wordpress-adapter.php. No WordPress/network access.
define('ABSPATH', '/');
$hooks = array(); $uid = 11;
function add_filter($name,$callback,$priority=10,$args=1) { $GLOBALS['hooks'][$name]=$callback; }
function add_action($name,$callback,$priority=10,$args=1) { $GLOBALS['hooks'][$name]=$callback; }
function get_current_user_id() { return $GLOBALS['uid']; }
function is_user_logged_in() { return (bool)get_current_user_id(); }
function wp_json_encode($value) { return json_encode($value); }
function nocache_headers() {}
function check($condition,$message) { if (!$condition) { throw new Exception($message); } }
require __DIR__.'/../wordpress/linguai-learner-context.php';
$filter=$hooks['http_request_args'];
$args=array('headers'=>array('x-linguai-secret'=>'test-only-secret'),'body'=>json_encode(array('wp_user_id'=>999,'language'=>'zh')));
$result=$filter($args,'https://stefcio-memory.onrender.com/api/memory/get');
$body=json_decode($result['body'],true);
check($body['wp_user_id']===11 && $body['language']==='chiński','Identity must come from WordPress');
$read=$result['headers']['x-linguai-context'];
$save=$GLOBALS['linguai_save_context'][11]['chiński'];
$html='<div><elevenlabs-convai agent-id="test" dynamic-variables="'.htmlspecialchars(json_encode(array('wp_user_id'=>'11','language'=>'chiński')),ENT_QUOTES).'"></elevenlabs-convai></div>';
$render=$hooks['do_shortcode_tag'];$output=$render($html,'stefcio_widget');
libxml_use_internal_errors(true);$doc=new DOMDocument();$doc->loadHTML($output);libxml_clear_errors();
$vars=json_decode($doc->getElementsByTagName('elevenlabs-convai')->item(0)->getAttribute('dynamic-variables'),true);
check($vars['secret__learner_context']===$save,'Save capability must reach widget');
check(strpos($output,'test-only-secret')===false,'Shared secret must never reach HTML');
foreach (array('en'=>'angielski','es'=>'hiszpański','it'=>'włoski','zh'=>'chiński') as $code=>$language) {
    $hooks['pre_do_shortcode_tag'](false,'stefcio_widget');
    $args['body']=json_encode(array('wp_user_id'=>999,'language'=>$code));
    $filter($args,'https://stefcio-memory.onrender.com/api/memory/get');
    $new='<elevenlabs-convai dynamic-variables="'.htmlspecialchars(json_encode(array('wp_user_id'=>'11','language'=>'włoski','memory_found'=>'false')),ENT_QUOTES).'"></elevenlabs-convai>';
    $out=$render($new,'stefcio_widget');$doc->loadHTML($out);libxml_clear_errors();
    $v=json_decode($doc->getElementsByTagName('elevenlabs-convai')->item(0)->getAttribute('dynamic-variables'),true);
    check($v['language']===$language,'New learner must keep selected language');
    check($v['secret__learner_context']===$GLOBALS['linguai_save_context'][11][$language],'Token must match selected language');
    check($render($new,'stefcio_widget')===$new,'A later render must not reuse previous capability');
}
$uid=0;$blocked=$filter($args,'https://stefcio-memory.onrender.com/api/memory/get');
check(!isset($blocked['headers']['x-linguai-secret']),'Logged-out request must lose credentials');
check($render($html,'stefcio_widget')===$html,'Logged-out widget must not receive capability');
echo json_encode(array('read'=>$read,'save'=>$save));
