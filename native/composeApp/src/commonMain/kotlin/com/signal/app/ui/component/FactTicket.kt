package com.signal.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.ui.material.StickerPaper
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalShapes
import kotlinx.coroutines.launch

@Composable
fun FactTicket(
  index: Int,
  value: String,
  showRemove: Boolean,
  error: String?,
  onValueChange: (String) -> Unit,
  onRemove: () -> Unit,
  modifier: Modifier = Modifier,
  canMoveEarlier: Boolean = false,
  canMoveLater: Boolean = false,
  onMoveEarlier: () -> Unit = {},
  onMoveLater: () -> Unit = {},
  imeAction: ImeAction = ImeAction.Default,
) {
  val focusManager = LocalFocusManager.current
  val keyboardController = LocalSoftwareKeyboardController.current
  val bringIntoViewRequester = remember { BringIntoViewRequester() }
  val coroutineScope = rememberCoroutineScope()
  val ticketLabel = "FACT ${(index + 1).toString().padStart(2, '0')}"

  StickerPaper(modifier = modifier) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text(
        ticketLabel,
        color = SignalColors.White,
        fontWeight = FontWeight.Black,
        fontSize = 10.sp,
        letterSpacing = 1.sp,
        modifier = Modifier
          .clip(SignalShapes.Control)
          .background(
            Brush.verticalGradient(
              listOf(SignalColors.White, SignalColors.Purple, SignalColors.Pink),
            ),
          )
          .border(1.dp, SignalColors.Ink, SignalShapes.Control)
          .padding(horizontal = 7.dp, vertical = 4.dp),
      )
      if (showRemove || canMoveEarlier || canMoveLater) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
          if (canMoveEarlier || canMoveLater) {
            TicketAction(
              label = "↑",
              accessibilityLabel = "${ticketLabel}を前へ移動",
              enabled = canMoveEarlier,
              onClick = onMoveEarlier,
            )
            TicketAction(
              label = "↓",
              accessibilityLabel = "${ticketLabel}を後ろへ移動",
              enabled = canMoveLater,
              onClick = onMoveLater,
            )
          }
          if (showRemove) {
            TicketAction(
              label = "削除",
              accessibilityLabel = "${ticketLabel}を削除",
              color = SignalColors.Pink,
              onClick = onRemove,
            )
          }
        }
      } else {
        Text("FACT ONLY", color = SignalColors.Muted, fontWeight = FontWeight.Black, fontSize = 9.sp)
      }
    }
    Spacer(Modifier.height(8.dp))
    OutlinedTextField(
      value = value,
      onValueChange = { onValueChange(it.take(300)) },
      modifier = Modifier
        .fillMaxWidth()
        .heightIn(min = 94.dp)
        .bringIntoViewRequester(bringIntoViewRequester)
        .onFocusChanged { focusState ->
          if (focusState.isFocused) coroutineScope.launch { bringIntoViewRequester.bringIntoView() }
        },
      label = { Text("相手の発言・行動", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
      placeholder = {
        Text(
          "例：相手から来週空いているか聞かれた",
          color = SignalColors.Muted.copy(alpha = .7f),
          fontSize = 13.sp,
        )
      },
      textStyle = TextStyle(
        color = SignalColors.Ink,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 22.sp,
      ),
      keyboardOptions = KeyboardOptions(imeAction = imeAction),
      keyboardActions = KeyboardActions(
        onNext = { focusManager.moveFocus(FocusDirection.Down) },
        onDone = { keyboardController?.hide() },
      ),
      minLines = 3,
      maxLines = 5,
      shape = RoundedCornerShape(11.dp),
      colors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = SignalColors.Purple,
        unfocusedBorderColor = SignalColors.Ink,
        focusedContainerColor = SignalColors.White.copy(alpha = .66f),
        unfocusedContainerColor = SignalColors.White.copy(alpha = .60f),
        cursorColor = SignalColors.Purple,
      ),
    )
    Spacer(Modifier.height(6.dp))
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text(
        error ?: "解釈ではなく、見たこと・聞いたことだけ。",
        color = if (error == null) SignalColors.Muted else SignalColors.Pink,
        fontWeight = FontWeight.Bold,
        fontSize = 10.sp,
      )
      Text("${value.length} / 300", color = SignalColors.Muted, fontWeight = FontWeight.Bold, fontSize = 10.sp)
    }
  }
}

@Composable
private fun TicketAction(
  label: String,
  accessibilityLabel: String,
  color: androidx.compose.ui.graphics.Color = SignalColors.Ink,
  enabled: Boolean = true,
  onClick: () -> Unit,
) {
  Box(
    modifier = Modifier
      .size(48.dp)
      .semantics { contentDescription = accessibilityLabel }
      .clickable(
        enabled = enabled,
        role = Role.Button,
        onClickLabel = accessibilityLabel,
        onClick = onClick,
      ),
    contentAlignment = Alignment.Center,
  ) {
    Text(
      label,
      color = if (enabled) color else SignalColors.Muted,
      fontWeight = FontWeight.Black,
      fontSize = if (label == "削除") 12.sp else 18.sp,
    )
  }
}
