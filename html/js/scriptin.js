var app = angular.module("mineos", [])

app.controller("Webui", ['$scope', function($scope) {
	$scope.page = 'dashboard';
}]);

String.prototype.format = String.prototype.f = function() {
  var s = this,
      i = arguments.length;

  while (i--) { s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);}
  return s;
};