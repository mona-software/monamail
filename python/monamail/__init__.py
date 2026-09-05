from .client import MonaMail, MonaMailError
from .webhook import verify_webhook

__version__ = '0.1.0'
__all__ = ['MonaMail', 'MonaMailError', 'verify_webhook']
MonaMail.verify_webhook = staticmethod(verify_webhook)
