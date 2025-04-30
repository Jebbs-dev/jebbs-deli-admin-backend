import moduleAlias from 'module-alias';
import path from 'path';

moduleAlias.addAliases({
  '@/auth': path.join(__dirname, 'auth'),
  '@/config': path.join(__dirname, 'config'),
  '@/middlewares': path.join(__dirname, 'middlewares'),
  '@/modules': path.join(__dirname, 'modules'),
  '@/utils': path.join(__dirname, 'utils'),
}); 